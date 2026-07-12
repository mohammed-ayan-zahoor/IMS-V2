import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PDFMeIDCardTemplate from "@/models/PDFMeIDCardTemplate";
import User from "@/models/User";
import Institute from "@/models/Institute";
import PDFMeStudentIDCard from "@/models/PDFMeStudentIDCard";
import { getInstituteScope } from "@/middleware/instituteScope";
import { validateAndDeriveSession, logSessionAccess } from "@/middleware/sessionValidation";
import { generate } from "@pdfme/generator";
import { text, image, barcodes } from "@pdfme/schemas";
const qrcode = barcodes.qrcode;
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryOptions, getUploadFolder } from "@/lib/cloudinaryResolver";
import path from "path";
import fs from "fs";
import pLimit from "p-limit";

// Global cache for base background PDFs (prevents re-downloading from Cloudinary on every generate call)
const pdfCache = new Map();

export const runtime = "nodejs";

function validateRequest(body) {
    const errors = [];
    if (!body.templateId) errors.push("templateId is required");
    if (!body.studentIds) errors.push("studentIds is required");
    if (!Array.isArray(body.studentIds)) errors.push("studentIds must be an array");
    if (Array.isArray(body.studentIds) && body.studentIds.length === 0) errors.push("studentIds cannot be empty");
    return { valid: errors.length === 0, errors };
}

async function uploadToCloudinaryScoped(buffer, folder, scopedOptions) {
    return new Promise((resolve, reject) => {
        try {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'raw',
                    ...scopedOptions
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(buffer);
        } catch (error) {
            reject(error);
        }
    });
}

async function deleteFromCloudinaryScoped(publicId, scopedOptions) {
    if (!publicId) return null;
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(
            publicId,
            { resource_type: 'raw', ...scopedOptions },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
    });
}

function resolveImagePath(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("/api/uploads/files/")) {
        const filename = imageUrl.split("/").pop();
        return path.join(process.cwd(), "public/uploads", filename);
    }
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
    }
    if (imageUrl.startsWith("/")) {
        return path.join(process.cwd(), "public", imageUrl);
    }
    return imageUrl;
}

async function getImageAsBase64(imageUrl) {
    const TRANSPARENT_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    if (!imageUrl) return TRANSPARENT_PNG;
    try {
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            console.log(`[PDFMeIDCard] Fetching student photo from URL: ${imageUrl}`);
            const res = await fetch(imageUrl);
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = res.headers.get("content-type") || "image/png";
                return `data:${contentType};base64,${buffer.toString("base64")}`;
            } else {
                console.warn(`[PDFMeIDCard] Failed to fetch student photo URL: ${imageUrl}, status: ${res.status}`);
                return TRANSPARENT_PNG;
            }
        }

        const resolvedPath = resolveImagePath(imageUrl);
        if (resolvedPath && fs.existsSync(resolvedPath)) {
            const fileBuffer = fs.readFileSync(resolvedPath);
            const ext = path.extname(resolvedPath).substring(1) || "png";
            return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
        }
    } catch (e) {
        console.warn(`[PDFMeIDCard] Failed to convert image to base64: ${imageUrl}`, e.message);
    }
    return TRANSPARENT_PNG;
}

async function processImage(imageUrl, element) {
    const base64 = await getImageAsBase64(imageUrl);
    const TRANSPARENT_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    if (!base64 || base64 === TRANSPARENT_PNG) {
        return TRANSPARENT_PNG;
    }

    const shape = element.imageShape || "rectangle";
    const borderRadiusMm = element.imageBorderRadius || 0;

    if (shape === "rectangle" && borderRadiusMm === 0) {
        return base64; // No modification needed
    }

    try {
        const { createCanvas, loadImage } = await import("canvas");
        const img = await loadImage(base64);

        // Get dimensions in mm
        const elWidthMm = element.width || 35;
        const elHeightMm = element.height || 45;

        // Use a resolution factor for crisp PDF rendering (1mm = 10px)
        const scaleFactor = 10;
        const canvasWidth = Math.round(elWidthMm * scaleFactor);
        const canvasHeight = Math.round(elHeightMm * scaleFactor);

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // 1. Calculate source crop dimensions for object-fit: cover
        const srcWidth = img.width;
        const srcHeight = img.height;
        const srcRatio = srcWidth / srcHeight;

        let targetRatio = canvasWidth / canvasHeight;
        if (shape === "square" || shape === "circle") {
            targetRatio = 1; // force 1:1 crop
        }

        let drawWidth = srcWidth;
        let drawHeight = srcHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (srcRatio > targetRatio) {
            drawWidth = srcHeight * targetRatio;
            offsetX = (srcWidth - drawWidth) / 2;
        } else if (srcRatio < targetRatio) {
            drawHeight = srcWidth / targetRatio;
            offsetY = (srcHeight - drawHeight) / 2;
        }

        // 2. Draw clipping path
        ctx.beginPath();
        if (shape === "circle") {
            const size = Math.min(canvasWidth, canvasHeight);
            const startX = (canvasWidth - size) / 2;
            const startY = (canvasHeight - size) / 2;
            const radius = size / 2;
            ctx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, startX, startY, size, size);
        } else if (shape === "square") {
            const size = Math.min(canvasWidth, canvasHeight);
            const startX = (canvasWidth - size) / 2;
            const startY = (canvasHeight - size) / 2;
            ctx.rect(startX, startY, size, size);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, startX, startY, size, size);
        } else if (shape === "rounded" || (shape === "rectangle" && borderRadiusMm > 0)) {
            const radius = Math.min(borderRadiusMm * scaleFactor, Math.min(canvasWidth, canvasHeight) / 2);
            ctx.moveTo(radius, 0);
            ctx.lineTo(canvasWidth - radius, 0);
            ctx.quadraticCurveTo(canvasWidth, 0, canvasWidth, radius);
            ctx.lineTo(canvasWidth, canvasHeight - radius);
            ctx.quadraticCurveTo(canvasWidth, canvasHeight, canvasWidth - radius, canvasHeight);
            ctx.lineTo(radius, canvasHeight);
            ctx.quadraticCurveTo(0, canvasHeight, 0, canvasHeight - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvasWidth, canvasHeight);
        }

        return canvas.toDataURL("image/png");
    } catch (err) {
        console.warn("[PDFMeIDCard] Failed to crop/round image on backend:", err.message);
        return base64;
    }
}

function getNestedValue(obj, path) {
    if (!path || !obj) return null;
    path = path.trim();
    
    // 1. Try direct path (standard resolution) at root level
    let value = path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[part];
    }, obj);
    
    if (value !== undefined && value !== null && value !== '') return value;
    
    // 2. Try in student context (handles hydrated context from certificateService)
    if (obj.student && typeof obj.student === 'object') {
        value = path.split('.').reduce((acc, part) => {
            if (acc === null || acc === undefined) return undefined;
            return acc[part];
        }, obj.student);
        if (value !== undefined && value !== null && value !== '') return value;

        if (path.startsWith('student.')) {
            const subPath = path.substring(8);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.student);
            if (value !== undefined && value !== null && value !== '') return value;
        }
    }
    
    // 3. Try batch context
    if (obj.batch && typeof obj.batch === 'object') {
        if (path.startsWith('batch.')) {
            const subPath = path.substring(6);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.batch);
            if (value !== undefined && value !== null && value !== '') return value;
        } else {
            value = obj.batch[path];
            if (value !== undefined && value !== null && value !== '') return value;
        }
    }
    
    // 4. Try course context
    if (obj.course && typeof obj.course === 'object') {
        if (path.startsWith('course.')) {
            const subPath = path.substring(7);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.course);
            if (value !== undefined && value !== null && value !== '') return value;
        } else {
            value = obj.course[path];
            if (value !== undefined && value !== null && value !== '') return value;
        }
    }
    
    // 5. Try institute context
    if (obj.institute && typeof obj.institute === 'object') {
        if (path.startsWith('institute.')) {
            const subPath = path.substring(10);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.institute);
            if (value !== undefined && value !== null && value !== '') return value;
        } else {
            value = obj.institute[path];
            if (value !== undefined && value !== null && value !== '') return value;
        }
    }

    if (obj.profile && typeof obj.profile === 'object') {
        const profileValue = obj.profile[path] || getNestedValue(obj.profile, path);
        if (profileValue !== undefined && profileValue !== null && profileValue !== '') return profileValue;
    }

    if (obj[path] !== undefined && obj[path] !== null) {
        return obj[path];
    }
    
    return null;
}

function getLegacyFieldKey(key) {
    const mapping = {
        studentName: "student.fullName",
        fullName: "student.fullName",
        name: "student.fullName",
        firstName: "student.firstName",
        lastName: "student.lastName",
        
        studentId: "student.grNumber",
        grNumber: "student.grNumber",
        enrollmentNo: "student.enrollmentNo",
        enrollmentNumber: "student.enrollmentNo",
        rollNumber: "student.rollNo",
        rollNo: "student.rollNo",
        aadharNo: "student.uidNo",
        aadharNumber: "student.uidNo",
        apaarId: "student.apaarId",
        
        batch: "batch.name",
        batchName: "batch.name",
        section: "batch.name",
        course: "course.name",
        courseName: "course.name",
        std: "std",
        standard: "std",
        medium: "course.medium",
        
        phone: "student.phone",
        mobile: "student.phone",
        email: "student.email",
        bloodGroup: "student.bloodGroup",
        gender: "student.gender",
        dob: "student.dob",
        dateOfBirth: "student.dob",
        
        fatherName: "student.fatherName",
        motherName: "student.motherName",
        
        address: "student.fullAddress",
        fullAddress: "student.fullAddress",
        
        admissionDate: "student.admissionDate",
        joiningDate: "student.joiningDate",
        
        instituteName: "institute.name",
        institutePhone: "institute.phone",
        instituteEmail: "institute.email",
        instituteAddress: "institute.address"
    };
    return mapping[key] || null;
}

export async function POST(req) {
    try {
        await connectDB();
        
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('generate_id_cards')));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const body = await req.json();
        
        const validation = validateRequest(body);
        if (!validation.valid) {
            return NextResponse.json(
                { error: "Invalid request", details: validation.errors },
                { status: 400 }
            );
        }

        const { templateId, studentIds } = body;
        const instituteId = scope.instituteId;

        // Fetch template
        const template = await PDFMeIDCardTemplate.findOne({
            _id: templateId,
            institute: instituteId
        }).lean();

        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        // Prepare template JSON and resolve basePdf URL if needed
        const activeTemplateJson = { ...template.templateJson };
        if (activeTemplateJson && typeof activeTemplateJson.basePdf === "string" && activeTemplateJson.basePdf.startsWith("http")) {
            const pdfUrl = activeTemplateJson.basePdf;
            try {
                if (pdfCache.has(pdfUrl)) {
                    console.log(`[PDFMeIDCard] Using cached basePdf background for: ${pdfUrl}`);
                    activeTemplateJson.basePdf = pdfCache.get(pdfUrl);
                } else {
                    console.log(`[PDFMeIDCard] Downloading basePdf background from Cloudinary: ${pdfUrl}`);
                    const pdfRes = await fetch(pdfUrl);
                    if (pdfRes.ok) {
                        const arrayBuffer = await pdfRes.arrayBuffer();
                        const pdfBuffer = Buffer.from(arrayBuffer);
                        const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
                        pdfCache.set(pdfUrl, base64Pdf);
                        activeTemplateJson.basePdf = base64Pdf;
                    } else {
                        console.error(`[PDFMeIDCard] Failed to download basePdf background from Cloudinary: status ${pdfRes.status}`);
                        return NextResponse.json(
                            { error: "Failed to download template background from Cloudinary" },
                            { status: 500 }
                        );
                    }
                }
            } catch (fetchErr) {
                console.error("[PDFMeIDCard] Error downloading basePdf background:", fetchErr);
                return NextResponse.json(
                    { error: "Failed to load template background assets" },
                    { status: 500 }
                );
            }
        }

        // Fetch institute profile
        const institute = await Institute.findById(instituteId).lean();
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }
        const instituteType = institute.type;

        // Session validation & derivation
        let sessionId = null;
        try {
            const sessionResult = await validateAndDeriveSession(req, scope);
            sessionId = sessionResult.sessionId;
            
            if (sessionId) {
                await logSessionAccess(session.user.id, instituteId, sessionId, 'idcard_pdfme_generate');
            }
            
            if (instituteType === 'SCHOOL' && !sessionId) {
                return NextResponse.json(
                    { error: "Active academic session is required for school-type institutes" },
                    { status: 403 }
                );
            }
        } catch (sessionErr) {
            console.error("[PDFMeIDCard] Session validation error:", sessionErr.message);
            if (instituteType === 'SCHOOL') {
                return NextResponse.json({ error: sessionErr.message }, { status: 403 });
            }
        }

        // Fetch student users (Verify scope and session)
        const studentQuery = {
            _id: { $in: studentIds },
            institute: instituteId,
            role: 'student'
        };

        if (instituteType === 'SCHOOL' && sessionId) {
            studentQuery.activeSessions = sessionId;
        }

        const students = await User.find(studentQuery).lean();
        if (students.length === 0) {
            return NextResponse.json(
                { error: "No matching active students found for this session/institute" },
                { status: 404 }
            );
        }

        // Resolve Cloudinary Scoped options once to avoid redundant DB reads & decryption
        const scopedOptions = await getCloudinaryOptions(instituteId);

        // Import dynamic dependencies once outside the parallel loop
        const Batch = (await import("@/models/Batch")).default;
        const { getHydratedContext } = await import("@/services/certificateService");

        console.log(`[PDFMeIDCard] Generating PDF cards for ${students.length} students using template "${template.name}" in parallel`);

        const studentCards = [];
        const failedCards = [];

        // Limit concurrent generations to 5 to protect memory and respect rate-limits
        const limitGen = pLimit(5);

        const generationPromises = students.map((student) =>
            limitGen(async () => {
                try {
                    // Find batch for this student
                    const batchQuery = {
                        'enrolledStudents.student': student._id,
                        deletedAt: null
                    };
                    if (instituteType === 'SCHOOL' && sessionId) {
                        batchQuery.session = sessionId;
                    }
                    
                    const studentBatch = await Batch.findOne(batchQuery).populate('course').lean();

                    // Get hydrated context
                    const context = await getHydratedContext(student._id, instituteId, {
                        batchId: studentBatch?._id
                    });

                    // Generate input mapping for pdfme
                    const inputs = {};
                    const schemas = template.templateJson.schemas || [];
                    
                    // Let's also resolve dataMode for qrCode if present
                    let qrDataMode = "profileUrl";
                    for (const page of schemas) {
                        if (Array.isArray(page)) {
                            for (const element of page) {
                                if ((element.type === "qrcode" || element.name === "qrCode") && element.dataMode) {
                                    qrDataMode = element.dataMode;
                                }
                            }
                        }
                    }

                    for (const page of schemas) {
                        if (Array.isArray(page)) {
                            for (const element of page) {
                                const key = element.name;
                                if (!key || inputs[key] !== undefined) continue; // Skip duplicates
                                
                                if (element.type === "static") {
                                    inputs[key] = element.staticText || "";
                                } else if (element.type === "image" || key === "studentPhoto") {
                                    let avatarUrl = null;
                                    const fieldKey = element.fieldKey;
                                    if (fieldKey) {
                                        avatarUrl = getNestedValue(context, fieldKey);
                                    }
                                    if (!avatarUrl) {
                                        avatarUrl = getNestedValue(context, "avatar") || 
                                                   getNestedValue(context, "profile.avatar") ||
                                                   getNestedValue(context, "profilePicture") ||
                                                   getNestedValue(context, "student.avatar") ||
                                                   getNestedValue(context, "student.profile.avatar");
                                    }
                                    inputs[key] = avatarUrl ? await processImage(avatarUrl, element) : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                                } else if (element.type === "qrcode" || key === "qrCode") {
                                    let qrPayload = student._id.toString();
                                    if (qrDataMode === "profileUrl") {
                                        qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.local"}/profile/${qrPayload}`;
                                    } else if (qrDataMode === "vcard") {
                                        const firstName = getNestedValue(context, "profile.firstName") || getNestedValue(context, "firstName") || "";
                                        const lastName = getNestedValue(context, "profile.lastName") || getNestedValue(context, "lastName") || "";
                                        const studentName = `${firstName} ${lastName}`.trim();
                                        const instName = institute?.name || "";
                                        qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${studentName}\nORG:${instName}\nTITLE:Student\nEND:VCARD`;
                                    }
                                    inputs[key] = qrPayload;
                                } else {
                                    // Text dynamic values
                                    let fieldKey = element.fieldKey;
                                    if (!fieldKey) {
                                        fieldKey = getLegacyFieldKey(key) || key;
                                    }
                                    let val = getNestedValue(context, fieldKey);
                                    let textVal = (val !== null && val !== undefined) ? val.toString().trim() : "";
                                    
                                    // Format date if needed
                                    const isDateField = ['admissionDate', 'joiningDate', 'dob', 'dateOfBirth', 'createdAt', 'leavingDate'].some(k => fieldKey.toLowerCase().includes(k.toLowerCase()));
                                    if (isDateField && val && !textVal.includes('/')) {
                                        try {
                                            const dateObj = new Date(val);
                                            if (!isNaN(dateObj.getTime())) {
                                                textVal = dateObj.toLocaleDateString('en-GB');
                                            }
                                        } catch (e) {}
                                    }
                                    inputs[key] = textVal === 'N/A' ? "" : textVal;
                                }
                            }
                        }
                    }

                    // Generate PDF using pdfme
                    const pdfUint8Array = await generate({
                        template: activeTemplateJson,
                        inputs: [inputs],
                        plugins: { text, image, qrcode }
                    });
                    const pdfBuffer = Buffer.from(pdfUint8Array);

                    // Upload PDF to Cloudinary under scoped credentials (using pre-resolved scopedOptions)
                    const folder = getUploadFolder(instituteId, `students/${student._id}/id-cards-pdfme`);
                    const uploadResult = await uploadToCloudinaryScoped(pdfBuffer, folder, scopedOptions);

                    // Fetch older active PDF cards to schedule for background cleanup
                    const oldCards = await PDFMeStudentIDCard.find({
                        studentId: student._id,
                        instituteId,
                        status: 'ACTIVE'
                    }, { pdfPublicId: 1 }).lean();

                    // Cleanup older active PDF cards asynchronously (fire-and-forget background tasks)
                    for (const oldCard of oldCards) {
                        if (oldCard.pdfPublicId) {
                            deleteFromCloudinaryScoped(oldCard.pdfPublicId, scopedOptions).catch((delErr) => {
                                console.warn(`[PDFMeIDCard] Failed to clean up old asset ${oldCard.pdfPublicId} asynchronously:`, delErr.message);
                            });
                        }
                    }

                    await PDFMeStudentIDCard.updateMany(
                        { studentId: student._id, instituteId, status: 'ACTIVE' },
                        { status: 'EXPIRED' }
                    );

                    // Save new record
                    const cardRecord = await PDFMeStudentIDCard.create({
                        studentId: student._id,
                        instituteId,
                        templateId: template._id,
                        pdfUrl: uploadResult.secure_url,
                        pdfPublicId: uploadResult.public_id,
                        status: 'ACTIVE'
                    });

                    return {
                        success: true,
                        card: {
                            studentId: student.grNumber || student.enrollmentNumber || student._id.toString(),
                            name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
                            pdfUrl: uploadResult.secure_url,
                            cardId: cardRecord._id.toString()
                        }
                    };

                } catch (cardError) {
                    console.error(`[PDFMeIDCard] Error generating for student ${student._id}:`, cardError);
                    return {
                        success: false,
                        failedCard: {
                            name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email,
                            error: cardError.message
                        }
                    };
                }
            })
        );

        const results = await Promise.all(generationPromises);

        for (const res of results) {
            if (res.success) {
                studentCards.push(res.card);
            } else {
                failedCards.push(res.failedCard);
            }
        }

        if (studentCards.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate any ID cards", details: failedCards },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            generated: studentCards.length,
            failed: failedCards.length,
            total: students.length,
            studentCards,
            failedCards: failedCards.length > 0 ? failedCards : undefined,
            message: `Successfully generated ${studentCards.length} ID card(s)${failedCards.length > 0 ? ` (${failedCards.length} failed)` : ""}`
        });

    } catch (error) {
        console.error("[PDFMeIDCard GET] Error:", error);
        return NextResponse.json(
            { error: "Failed to bulk generate ID cards", details: error.message },
            { status: 500 }
        );
    }
}
