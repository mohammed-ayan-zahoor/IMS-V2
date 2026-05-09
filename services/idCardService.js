import { createCanvas, loadImage, registerFont } from "canvas";
import QRCode from "qrcode";
import path from "path";

// Register fonts
const fontDir = path.join(process.cwd(), "public/fonts");
try {
    registerFont(path.join(fontDir, "Roboto-Regular.ttf"), { family: "Roboto" });
    registerFont(path.join(fontDir, "Roboto-Bold.ttf"), { family: "Roboto", weight: "bold" });
} catch (err) {
    console.warn("[IDCardService] Font registration warning:", err.message);
}

const DPI = 300; // High resolution for ID cards
const MM_TO_PX = DPI / 25.4;

/**
 * Helper to resolve local paths from API URLs for canvas loadImage
 */
function resolveImagePath(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("/api/uploads/files/")) {
        const filename = imageUrl.split("/").pop();
        return path.join(process.cwd(), "public/uploads", filename);
    }
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
    }
    // Fallback for other absolute paths starting with /
    if (imageUrl.startsWith("/")) {
        return path.join(process.cwd(), "public", imageUrl);
    }
    return imageUrl;
}

/**
 * Render front side of ID card
 */
export async function renderIDCardFront(student, template) {
    try {
        // Load front image
        const resolvedFrontUrl = resolveImagePath(template.frontImageUrl);
        const frontImage = await loadImage(resolvedFrontUrl);
        
        // Create canvas with actual image dimensions
        const canvas = createCanvas(frontImage.width, frontImage.height);
        const ctx = canvas.getContext("2d");

        // Draw background image
        ctx.drawImage(frontImage, 0, 0);

        // Map placeholders (convert from Mongoose Map if necessary)
        const placeholders = template.frontPlaceholders instanceof Map 
            ? template.frontPlaceholders 
            : new Map(Object.entries(template.frontPlaceholders || {}));

        for (const [key, config] of placeholders.entries()) {
            if (!config.enabled) continue;

            try {
                if (config.type === "image" || key === "studentPhoto") {
                    // Try multiple field paths for student photo
                    let avatarUrl = null;
                    const fieldKey = config.fieldKey;
                    
                    if (fieldKey) {
                        avatarUrl = getNestedValue(student, fieldKey);
                    }
                    // Fallback to common avatar paths
                    if (!avatarUrl) {
                        avatarUrl = getNestedValue(student, "avatar") || 
                                   getNestedValue(student, "profile.avatar") ||
                                   getNestedValue(student, "profilePicture");
                    }
                    
                    if (avatarUrl) {
                        try {
                            const resolvedPhotoUrl = resolveImagePath(avatarUrl);
                            const photoImage = await loadImage(resolvedPhotoUrl);
                            drawImage(ctx, photoImage, config, frontImage.width, frontImage.height);
                        } catch (photoError) {
                            console.warn(`[IDCardService] Could not load photo: ${avatarUrl}`, photoError.message);
                        }
                    }
                } else if (config.type === "qr" || key === "qrCode") {
                    try {
                        let qrPayload = student.id || student._id?.toString() || "unknown";
                        if (config.dataMode === "profileUrl") {
                            qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.local"}/profile/${qrPayload}`;
                        } else if (config.dataMode === "vcard") {
                            const firstName = student.firstName || student.profile?.firstName || "";
                            const lastName = student.lastName || student.profile?.lastName || "";
                            const studentName = `${firstName} ${lastName}`.trim();
                            qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${studentName}\nTITLE:Student\nEND:VCARD`;
                        }
                        const qrDataUrl = await generateQRCode(qrPayload);
                        const qrImage = await loadImage(qrDataUrl);
                        drawImage(ctx, qrImage, config, frontImage.width, frontImage.height);
                    } catch (qrError) {
                        console.warn(`[IDCardService] QR Code generation failed:`, qrError.message);
                    }
                } else {
                    // Text elements (field or static)
                    let text = "";
                    if (config.type === "static") {
                        text = config.staticText || "";
                    } else {
                        // Dynamic field - priority: config.fieldKey > legacy mapping > key itself
                        let fieldKey = config.fieldKey;
                        if (!fieldKey) {
                            fieldKey = getLegacyFieldKey(key) || key;
                        }
                        
                        if (fieldKey) {
                            const val = getNestedValue(student, fieldKey);
                            text = val ? val.toString().trim() : "";
                            
                            // Special formatting for specific fields
                            if ((fieldKey === 'admissionDate' || fieldKey === 'joiningDate' || fieldKey === 'dob') && val && !text.includes('/')) {
                                try {
                                    text = new Date(val).toLocaleDateString('en-GB');
                                } catch (e) {
                                    // Keep original text if date parsing fails
                                }
                            }
                        }
                    }

                    if (text && text !== 'N/A') {
                        drawText(ctx, text, config, frontImage.width, frontImage.height);
                    }
                }
            } catch (elemError) {
                console.warn(`[IDCardService] Error rendering element ${key}:`, elemError.message);
            }
        }

        return canvas;
    } catch (error) {
        console.error("[IDCardService] Error rendering front:", error);
        throw error;
    }
}

/**
 * Render back side of ID card
 */
export async function renderIDCardBack(student, template, institute) {
    try {
        const resolvedBackUrl = resolveImagePath(template.backImageUrl);
        const backImage = await loadImage(resolvedBackUrl);
        
        const canvas = createCanvas(backImage.width, backImage.height);
        const ctx = canvas.getContext("2d");

        // Draw background image
        ctx.drawImage(backImage, 0, 0);

        const placeholders = template.backPlaceholders instanceof Map 
            ? template.backPlaceholders 
            : new Map(Object.entries(template.backPlaceholders || {}));

        for (const [key, config] of placeholders.entries()) {
            if (!config.enabled) continue;

            try {
                if (config.type === "qr" || key === "qrCode") {
                    try {
                        let qrPayload = student.id || student._id?.toString() || "unknown";
                        if (config.dataMode === "profileUrl") {
                            qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.local"}/profile/${qrPayload}`;
                        } else if (config.dataMode === "vcard") {
                            const firstName = student.firstName || student.profile?.firstName || "";
                            const lastName = student.lastName || student.profile?.lastName || "";
                            const studentName = `${firstName} ${lastName}`.trim();
                            const institName = institute?.name || getNestedValue(student, "institute.name") || "";
                            qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${studentName}\nORG:${institName}\nTITLE:Student\nEND:VCARD`;
                        }
                        const qrDataUrl = await generateQRCode(qrPayload);
                        const qrImage = await loadImage(qrDataUrl);
                        drawImage(ctx, qrImage, config, backImage.width, backImage.height);
                    } catch (qrError) {
                        console.warn(`[IDCardService] QR Code generation failed:`, qrError.message);
                    }
                } else if (config.type === "image") {
                    try {
                        const fieldKey = config.fieldKey;
                        const imageUrl = fieldKey ? getNestedValue(student, fieldKey) : null;
                        if (imageUrl) {
                            const resolvedPhotoUrl = resolveImagePath(imageUrl);
                            const photoImage = await loadImage(resolvedPhotoUrl);
                            drawImage(ctx, photoImage, config, backImage.width, backImage.height);
                        }
                    } catch (photoError) {
                        console.warn(`[IDCardService] Could not load image:`, photoError.message);
                    }
                } else {
                    // Text elements
                    let text = "";
                    if (config.type === "static") {
                        text = config.staticText || "";
                    } else if (key === "instituteName") {
                        // Try multiple paths for institute name
                        text = (institute?.name) || 
                               getNestedValue(student, "institute.name") ||
                               getNestedValue(student, "instituteName") || "";
                    } else if (key === "validity") {
                        text = calculateValidity();
                    } else if (key === "disclaimer") {
                        text = "This card is valid only when signed by authorized personnel";
                    } else {
                        // Dynamic field
                        let fieldKey = config.fieldKey;
                        if (!fieldKey) {
                            fieldKey = getLegacyFieldKey(key) || key;
                        }
                        
                        if (fieldKey) {
                            const val = getNestedValue(student, fieldKey);
                            text = val ? val.toString().trim() : "";
                        }
                    }

                    if (text && text !== 'N/A') {
                        drawText(ctx, text, config, backImage.width, backImage.height);
                    }
                }
            } catch (elemError) {
                console.warn(`[IDCardService] Error rendering element ${key}:`, elemError.message);
            }
        }

        return canvas;
    } catch (error) {
        console.error("[IDCardService] Error rendering back:", error);
        throw error;
    }
}

/**
 * Helper to get nested value from object with fallback to root level and student context
 */
function getNestedValue(obj, path) {
    if (!path || !obj) return null;
    
    // First try direct path (handles nested paths like "student.fullName" or "batch.name")
    const value = path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[part];
    }, obj);
    
    if (value !== undefined && value !== null && value !== '') {
        return value;
    }
    
    // Fallback: try as root level key (for cases where data is flattened)
    if (obj[path] !== undefined && obj[path] !== null) {
        return obj[path];
    }
    
    // Additional fallback: try in student context (obj.student.{path})
    // This handles cases where fieldKey is "grNumber" but data is at context.student.grNumber
    if (obj.student && obj.student[path] !== undefined && obj.student[path] !== null && obj.student[path] !== '') {
        return obj.student[path];
    }
    
    return null;
}

/**
 * Legacy field mapping - Maps template field keys to actual data paths
 * Supports both root level and nested properties
 */
function getLegacyFieldKey(key) {
    const mapping = {
        // Direct mappings for student properties
        studentName: "fullName",
        fullName: "fullName",
        name: "fullName",
        
        // ID/Enrollment fields
        studentId: "grNumber",
        grNumber: "grNumber",
        enrollmentNo: "enrollmentNumber",
        enrollmentNumber: "enrollmentNumber",
        rollNumber: "rollNo",
        rollNo: "rollNo",
        
        // Contact information
        phone: "phone",
        email: "email",
        
        // Personal details
        bloodGroup: "bloodGroup",
        gender: "gender",
        dob: "dob",
        dateOfBirth: "dob",
        
        // Parent information
        fatherName: "fatherName",
        motherName: "motherName",
        aadharNumber: "aadharNumber",
        
        // Academic information (from batch/course context)
        batch: "batch.name",
        batchName: "batch.name",
        section: "section",
        course: "course.name",
        courseName: "course.name",
        std: "std",
        standard: "std",
        
        // Address
        city: "city",
        state: "state",
        address: "fullAddress",
        
        // Dates
        dateOfAdmission: "admissionDate",
        admissionDate: "admissionDate",
        joiningDate: "joiningDate",
        createdAt: "admissionDate",
        
        // School specific
        instituteName: "institute.name",
        instituteAddress: "institute.address",
        validity: "validity"
    };
    return mapping[key] || null;
}

/**
 * Helper: Draw text on canvas
 */
function drawText(ctx, text, config, canvasWidth, canvasHeight) {
    if (!text) return;
    
    const x = (config.x / 100) * canvasWidth;
    const y = (config.y / 100) * canvasHeight;
    
    // config.fontSize is an absolute pixel value relative to the 320px wide editor canvas.
    // We scale it proportionally to the actual canvas width.
    const referenceWidth = 320;
    const fontSize = Math.round((config.fontSize / referenceWidth) * canvasWidth);

    ctx.font = `${config.fontWeight === "bold" ? "bold " : ""}${fontSize}px "${config.fontFamily}"`;
    ctx.fillStyle = config.color || "#000000";
    ctx.textAlign = config.textAlign || "center";
    ctx.textBaseline = "middle";

    let displayText = text;
    if (config.textTransform === "uppercase") {
        displayText = displayText.toUpperCase();
    } else if (config.textTransform === "lowercase") {
        displayText = displayText.toLowerCase();
    } else if (config.textTransform === "capitalize") {
        displayText = displayText.replace(/\b\w/g, char => char.toUpperCase());
    }

    ctx.fillText(displayText, x, y);
}

/**
 * Helper: Draw image on canvas
 */
function drawImage(ctx, image, config, canvasWidth, canvasHeight) {
    const x = (config.x / 100) * canvasWidth;
    const y = (config.y / 100) * canvasHeight;
    let width = ((config.width || config.size) / 100) * canvasWidth;
    let height = ((config.height || config.size) / 100) * canvasHeight;
    
    // Enforce 1:1 aspect ratio for preset shapes
    if (config.shape && config.shape !== 'rectangle') {
        height = width;
    }

    // config.borderRadius is 0-50 (50% makes a circle/pill)
    let bRadConfig = config.borderRadius || 0;
    if (config.shape === 'circle') bRadConfig = 50;
    if (config.shape === 'square') bRadConfig = 0;
    if (config.shape === 'rounded-square') bRadConfig = 15;

    const maxRadius = Math.min(width, height) / 2;
    const borderRadius = (bRadConfig / 50) * maxRadius || 0;
    
    // config.borderWidth is an absolute pixel value from the 320px editor
    const referenceWidth = 320;
    const borderWidth = Math.round((config.borderWidth / referenceWidth) * canvasWidth) || 0;
    const borderColor = config.borderColor || "#000000";

    ctx.save();
    ctx.beginPath();
    // Center alignment adjustment
    const startX = x - width / 2;
    const startY = y - height / 2;

    if (borderRadius > 0) {
        ctx.moveTo(startX + borderRadius, startY);
        ctx.lineTo(startX + width - borderRadius, startY);
        ctx.quadraticCurveTo(startX + width, startY, startX + width, startY + borderRadius);
        ctx.lineTo(startX + width, startY + height - borderRadius);
        ctx.quadraticCurveTo(startX + width, startY + height, startX + width - borderRadius, startY + height);
        ctx.lineTo(startX + borderRadius, startY + height);
        ctx.quadraticCurveTo(startX, startY + height, startX, startY + height - borderRadius);
        ctx.lineTo(startX, startY + borderRadius);
        ctx.quadraticCurveTo(startX, startY, startX + borderRadius, startY);
        ctx.closePath();
        ctx.clip();
    } else {
        ctx.rect(startX, startY, width, height);
        ctx.clip();
    }

    // Object-cover logic to avoid stretching the image
    let sX = 0, sY = 0, sWidth = image.width, sHeight = image.height;
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;

    if (imageRatio > targetRatio) {
        // Image is wider than target. Crop left/right.
        sHeight = image.height;
        sWidth = sHeight * targetRatio;
        sX = (image.width - sWidth) / 2;
    } else {
        // Image is taller than target. Crop top/bottom.
        sWidth = image.width;
        sHeight = sWidth / targetRatio;
        sY = (image.height - sHeight) / 2;
    }

    ctx.drawImage(image, sX, sY, sWidth, sHeight, startX, startY, width, height);
    ctx.restore();

    if (borderWidth > 0) {
        ctx.save();
        ctx.beginPath();
        if (borderRadius > 0) {
            ctx.moveTo(startX + borderRadius, startY);
            ctx.lineTo(startX + width - borderRadius, startY);
            ctx.quadraticCurveTo(startX + width, startY, startX + width, startY + borderRadius);
            ctx.lineTo(startX + width, startY + height - borderRadius);
            ctx.quadraticCurveTo(startX + width, startY + height, startX + width - borderRadius, startY + height);
            ctx.lineTo(startX + borderRadius, startY + height);
            ctx.quadraticCurveTo(startX, startY + height, startX, startY + height - borderRadius);
            ctx.lineTo(startX, startY + borderRadius);
            ctx.quadraticCurveTo(startX, startY, startX + borderRadius, startY);
            ctx.closePath();
        } else {
            ctx.rect(startX, startY, width, height);
        }
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Generate QR code data URL
 */
async function generateQRCode(data) {
    try {
        return await QRCode.toDataURL(data, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 300,
            margin: 1,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });
    } catch (error) {
        console.error("[IDCardService] QR Code generation error:", error);
        throw error;
    }
}

/**
 * Calculate card validity (e.g., "Valid until: Dec 2027")
 */
function calculateValidity() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 4); // 4 year validity
    return `Valid until: ${date.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`;
}
