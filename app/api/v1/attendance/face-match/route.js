import { NextResponse } from "next/server";
import { verifyKioskKey } from "@/lib/attendance/kioskAuth";
import { extractDescriptor, matchFace } from "@/lib/attendance/faceMatcher";
import { recordPunch } from "@/lib/attendance/recordPunch";

// In-memory sliding-window rate limiter per kiosk device
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 40; // Max 40 scans/min per device

function checkRateLimit(keyId) {
    const now = Date.now();
    const timestamps = rateLimitMap.get(keyId) || [];
    const valid = timestamps.filter(t => (now - t) < RATE_LIMIT_WINDOW_MS);

    if (valid.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    valid.push(now);
    rateLimitMap.set(keyId, valid);
    return true;
}

export async function POST(req) {
    try {
        // 1. Authenticate Kiosk Key
        const suppliedKey = req.headers.get("x-kiosk-key") ||
                            req.headers.get("authorization")?.replace("Bearer ", "") ||
                            new URL(req.url).searchParams.get("kioskKey");

        if (!suppliedKey) {
            return NextResponse.json(
                { error: "Missing x-kiosk-key authorization header" },
                { status: 401 }
            );
        }

        const auth = await verifyKioskKey(suppliedKey);
        if (!auth.isValid || !auth.instituteId) {
            return NextResponse.json(
                { error: auth.error || "Invalid or revoked kiosk key" },
                { status: 401 }
            );
        }

        const instituteId = auth.instituteId;
        const deviceId = auth.device?.id || "legacy";

        // 2. Check Rate Limit
        if (!checkRateLimit(deviceId.toString())) {
            return NextResponse.json(
                { error: "Too many requests. Please slow down scan frequency." },
                { status: 429 }
            );
        }

        // 3. Extract Image Buffer and Punch Parameters
        let imageBuffer = null;
        let punchId = null;
        let forceAction = null;
        let dryRun = false;

        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("image") || formData.get("file");
            punchId = formData.get("punchId");
            forceAction = formData.get("forceAction");
            dryRun = formData.get("dryRun") === "true";

            if (file && typeof file.arrayBuffer === "function") {
                const bytes = await file.arrayBuffer();
                imageBuffer = Buffer.from(bytes);
            }
        } else if (contentType.includes("application/json")) {
            const body = await req.json();
            punchId = body.punchId;
            forceAction = body.forceAction;
            dryRun = Boolean(body.dryRun);

            if (body.image) {
                // Strip data URL prefix if present: "data:image/jpeg;base64,..."
                const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
                imageBuffer = Buffer.from(base64Data, "base64");
            }
        }

        if (!imageBuffer || imageBuffer.length === 0) {
            return NextResponse.json(
                { error: "Missing image file or base64 image data" },
                { status: 400 }
            );
        }

        // 4. On-Server Face Detection & 128-d Vector Extraction
        const extractRes = await extractDescriptor(imageBuffer);

        if (!extractRes.descriptor) {
            return NextResponse.json({
                matched: false,
                error: extractRes.error || "NO_FACE_DETECTED",
                message: "No clear face detected in the photo. Please align your face with the camera."
            }, { status: 422 });
        }

        // 5. Match against cached Institute Teacher Descriptors
        const matchRes = await matchFace(extractRes.descriptor, instituteId, {
            threshold: 0.55,
            margin: 0.08
        });

        if (!matchRes.matched || !matchRes.teacher) {
            return NextResponse.json({
                matched: false,
                error: "FACE_NOT_RECOGNIZED",
                distance: matchRes.distance,
                reason: matchRes.reason,
                message: "Face not recognized as an enrolled staff member. Please retry or contact HR."
            }, { status: 200 });
        }

        const teacher = matchRes.teacher;

        // 6. Record Unified Attendance Punch
        const punchRes = await recordPunch({
            instituteId,
            staffId: teacher.id,
            timestamp: new Date(),
            source: "face_scan",
            punchId: punchId || undefined,
            faceMatchDistance: matchRes.distance,
            forceAction: forceAction || undefined,
            dryRun
        });

        // 7. Return Kiosk Response
        return NextResponse.json({
            success: true,
            matched: true,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email,
                enrollmentNumber: teacher.enrollmentNumber,
                role: teacher.role,
                avatar: teacher.avatar
            },
            distance: Number(matchRes.distance.toFixed(4)),
            secondDistance: matchRes.secondDistance ? Number(matchRes.secondDistance.toFixed(4)) : null,
            action: punchRes.action,
            punchType: punchRes.punchType,
            time: punchRes.time,
            date: punchRes.date,
            lateMinutes: punchRes.lateMinutes || 0,
            earlyDepartureMinutes: punchRes.earlyDepartureMinutes || 0,
            overtimeMinutes: punchRes.overtimeMinutes || 0,
            message: punchRes.message
        });

    } catch (error) {
        console.error("Face Match API Error:", error);
        return NextResponse.json(
            { error: "Internal server error during face matching", details: error.message },
            { status: 500 }
        );
    }
}
