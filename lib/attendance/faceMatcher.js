import path from "path";
import sharp from "sharp";
import { createRequire } from "module";
import { connectDB } from "../mongodb.js";
import User from "../../models/User.js";

const require = createRequire(import.meta.url);
const faceapi = require("@vladmandic/face-api/dist/face-api.node-wasm.js");

let isInitialized = false;
let initPromise = null;

// In-memory cache: instituteId (string) -> { teachers: Array, loadedAt: number }
const descriptorCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Initializes the WASM engine and loads models from public/models/face-api
 */
export async function initFaceEngine() {
    if (isInitialized) return faceapi;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            if (faceapi.tf.getBackend() !== "wasm") {
                await faceapi.tf.setBackend("wasm");
                await faceapi.tf.ready();
            }
        } catch {
            await faceapi.tf.setBackend("cpu");
            await faceapi.tf.ready();
        }

        const modelsPath = path.resolve("./public/models/face-api");
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
        ]);

        isInitialized = true;
        return faceapi;
    })();

    return initPromise;
}

/**
 * Invalidates the cached descriptors for a given institute.
 * Call this when a teacher enrolls or updates their face vector.
 * @param {string|mongoose.Types.ObjectId} instituteId
 */
export function invalidateDescriptorCache(instituteId) {
    if (!instituteId) return;
    const key = instituteId.toString();
    descriptorCache.delete(key);
}

/**
 * Loads and caches all enrolled teachers for an institute.
 * @param {string|mongoose.Types.ObjectId} instituteId
 * @returns {Promise<Array<{ id: string, name: string, enrollmentNumber: string, role: string, avatar: string, descriptor: Float32Array }>>}
 */
export async function getInstituteTeachers(instituteId) {
    const key = instituteId.toString();
    const cached = descriptorCache.get(key);

    if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL_MS) {
        return cached.teachers;
    }

    await connectDB();

    const staffList = await User.find({
        institute: instituteId,
        role: { $in: ["instructor", "staff", "admin"] },
        deletedAt: null,
        faceDescriptor: { $exists: true, $ne: null }
    })
    .select("+faceDescriptor profile email role enrollmentNumber avatar hrDetails department name")
    .populate("department", "name")
    .populate("hrDetails.designation", "name title")
    .lean();

    const teachers = staffList
        .filter(u => u.faceDescriptor && u.faceDescriptor.length === 128)
        .map(u => {
            const fullName = `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim();
            const designation = u.hrDetails?.designation?.name || u.hrDetails?.designation?.title || (u.role === "admin" ? "Administrator" : u.role === "instructor" ? "Instructor" : "Staff");
            const departmentName = u.department?.name || "";

            return {
                id: u._id.toString(),
                name: fullName || u.name || u.email,
                email: u.email,
                enrollmentNumber: u.enrollmentNumber || "",
                role: u.role,
                designation,
                departmentName,
                avatar: u.profile?.avatar || null,
                descriptor: new Float32Array(u.faceDescriptor)
            };
        });

    descriptorCache.set(key, { teachers, loadedAt: Date.now() });
    return teachers;
}

/**
 * Calculates Euclidean Distance (L2 norm) between two 128-d vectors.
 */
export function euclideanDistance(arr1, arr2) {
    if (arr1.length !== arr2.length) return 999;
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        const diff = arr1[i] - arr2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Extracts a 128-dimensional face descriptor from an image buffer using sharp and face-api.
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ descriptor: Float32Array|null, detection: Object|null, error?: string }>}
 */
export async function extractDescriptor(imageBuffer) {
    await initFaceEngine();

    // 1. Process with sharp to ensure standard 3-channel RGB pixel buffer
    let rawBuffer, info;
    try {
        const sharpInstance = sharp(imageBuffer)
            .rotate() // auto-orient by EXIF
            .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true });

        const res = await sharpInstance.removeAlpha().raw().toBuffer({ resolveWithObject: true });
        rawBuffer = res.data;
        info = res.info;
    } catch (sharpErr) {
        return { descriptor: null, detection: null, error: "Invalid image data: " + sharpErr.message };
    }

    // 2. Create TensorFlow 3D tensor [height, width, 3]
    const tensor = faceapi.tf.tensor3d(new Uint8Array(rawBuffer), [info.height, info.width, 3]);

    try {
        // Run detection + 68 landmarks + 128-d recognition net
        const det = await faceapi
            .detectSingleFace(tensor, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!det || !det.descriptor) {
            return { descriptor: null, detection: null, error: "NO_FACE_DETECTED" };
        }

        return {
            descriptor: det.descriptor,
            detection: {
                box: det.detection.box,
                score: det.detection.score
            }
        };
    } finally {
        tensor.dispose();
    }
}

/**
 * Matches a live face descriptor against the institute's enrolled teachers.
 * Enforces both Threshold (<= 0.55) and Margin to second-best (>= 0.08).
 * @param {Float32Array} liveDescriptor
 * @param {string|mongoose.Types.ObjectId} instituteId
 * @param {Object} [options]
 * @param {number} [options.threshold=0.55]
 * @param {number} [options.margin=0.08]
 * @returns {Promise<{ matched: boolean, teacher?: Object, distance?: number, secondDistance?: number, reason?: string }>}
 */
export async function matchFace(liveDescriptor, instituteId, options = {}) {
    const threshold = options.threshold ?? 0.55;
    const minMargin = options.margin ?? 0.08;

    const teachers = await getInstituteTeachers(instituteId);
    if (!teachers || teachers.length === 0) {
        return { matched: false, reason: "NO_ENROLLED_TEACHERS" };
    }

    // Compute distance to each teacher
    const scores = [];
    for (const t of teachers) {
        const dist = euclideanDistance(liveDescriptor, t.descriptor);
        scores.push({ teacher: t, distance: dist });
    }

    // Sort ascending (lowest distance = closest match)
    scores.sort((a, b) => a.distance - b.distance);

    const best = scores[0];
    const second = scores.length > 1 ? scores[1] : null;

    // Check 1: Must be below threshold
    if (best.distance > threshold) {
        return {
            matched: false,
            distance: best.distance,
            reason: `Distance (${best.distance.toFixed(3)}) exceeds threshold (${threshold})`
        };
    }

    // Check 2: Margin check against second-best (to prevent lookalike ambiguity)
    if (second && (second.distance - best.distance) < minMargin) {
        return {
            matched: false,
            distance: best.distance,
            secondDistance: second.distance,
            reason: `Ambiguous match: margin (${(second.distance - best.distance).toFixed(3)}) is below required ${minMargin}`
        };
    }

    return {
        matched: true,
        teacher: best.teacher,
        distance: best.distance,
        secondDistance: second ? second.distance : null
    };
}
