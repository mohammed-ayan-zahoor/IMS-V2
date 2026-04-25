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

        const frontPlaceholders = template.frontPlaceholders;

        // Draw student name
        if (frontPlaceholders.studentName?.enabled && student.profile?.firstName) {
            const config = frontPlaceholders.studentName;
            const fullName = `${student.profile.firstName} ${student.profile.lastName || ""}`.trim();
            drawText(ctx, fullName, config, frontImage.width, frontImage.height);
        }

        // Draw student photo
        if (frontPlaceholders.studentPhoto?.enabled && student.profile?.avatar) {
            const config = frontPlaceholders.studentPhoto;
            try {
                const resolvedPhotoUrl = resolveImagePath(student.profile.avatar);
                const photoImage = await loadImage(resolvedPhotoUrl);
                drawImage(ctx, photoImage, config, frontImage.width, frontImage.height);
            } catch (err) {
                console.warn(`[IDCardService] Could not load photo for student ${student._id}:`, err.message);
            }
        }

        // Draw student ID (using enrollmentNumber)
        if (frontPlaceholders.studentId?.enabled && student.enrollmentNumber) {
            const config = frontPlaceholders.studentId;
            drawText(ctx, student.enrollmentNumber, config, frontImage.width, frontImage.height);
        }

        // Draw batch (optional)
        if (frontPlaceholders.batch?.enabled && student.batch?.name) {
            const config = frontPlaceholders.batch;
            drawText(ctx, student.batch.name, config, frontImage.width, frontImage.height);
        }

        // Draw roll number (mapping to enrollmentNumber for now if enabled)
        if (frontPlaceholders.rollNumber?.enabled && student.enrollmentNumber) {
            const config = frontPlaceholders.rollNumber;
            drawText(ctx, `Roll: ${student.enrollmentNumber}`, config, frontImage.width, frontImage.height);
        }

        // Draw admission date (using createdAt)
        if (frontPlaceholders.dateOfAdmission?.enabled && student.createdAt) {
            const config = frontPlaceholders.dateOfAdmission;
            const date = new Date(student.createdAt).toLocaleDateString();
            drawText(ctx, date, config, frontImage.width, frontImage.height);
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

        const backPlaceholders = template.backPlaceholders;

        // Draw institute name
        if (backPlaceholders.instituteName?.enabled && institute?.name) {
            const config = backPlaceholders.instituteName;
            drawText(ctx, institute.name, config, backImage.width, backImage.height);
        }

        // Draw validity
        if (backPlaceholders.validity?.enabled) {
            const config = backPlaceholders.validity;
            const validity = calculateValidity();
            drawText(ctx, validity, config, backImage.width, backImage.height);
        }

        // Draw QR Code
        if (backPlaceholders.qrCode?.enabled && student._id) {
            const config = backPlaceholders.qrCode;
            let qrPayload = student._id.toString();
            if (config.dataMode === "profileUrl") {
                qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://quantech.vercel.app"}/profile/${student._id}`;
            } else if (config.dataMode === "vcard") {
                qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${student.profile?.lastName || ""};${student.profile?.firstName || ""};;;\nFN:${student.profile?.firstName || ""} ${student.profile?.lastName || ""}\nORG:${institute?.name || ""}\nTITLE:Student\nEND:VCARD`;
            }
            const qrDataUrl = await generateQRCode(qrPayload);
            const qrImage = await loadImage(qrDataUrl);
            drawImage(ctx, qrImage, config, backImage.width, backImage.height);
        }

        // Draw disclaimer
        if (backPlaceholders.disclaimer?.enabled) {
            const config = backPlaceholders.disclaimer;
            const disclaimer = "This card is valid only when signed by authorized personnel";
            drawText(ctx, disclaimer, config, backImage.width, backImage.height);
        }

        return canvas;
    } catch (error) {
        console.error("[IDCardService] Error rendering back:", error);
        throw error;
    }
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
