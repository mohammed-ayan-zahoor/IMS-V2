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
 * Render front side of ID card
 */
export async function renderIDCardFront(student, template) {
    try {
        // Load front image
        const frontImage = await loadImage(template.frontImageUrl);
        
        // Create canvas with actual image dimensions
        const canvas = createCanvas(frontImage.width, frontImage.height);
        const ctx = canvas.getContext("2d");

        // Draw background image
        ctx.drawImage(frontImage, 0, 0);

        const frontPlaceholders = template.frontPlaceholders;

        // Draw student name
        if (frontPlaceholders.studentName?.enabled && student.firstName) {
            const config = frontPlaceholders.studentName;
            const fullName = `${student.firstName} ${student.lastName || ""}`.trim();
            drawText(ctx, fullName, config, frontImage.width, frontImage.height);
        }

        // Draw student photo
        if (frontPlaceholders.studentPhoto?.enabled && student.photo) {
            const config = frontPlaceholders.studentPhoto;
            try {
                const photoImage = await loadImage(student.photo);
                drawImage(ctx, photoImage, config, frontImage.width, frontImage.height);
            } catch (err) {
                console.warn(`[IDCardService] Could not load photo for student ${student._id}:`, err.message);
            }
        }

        // Draw student ID
        if (frontPlaceholders.studentId?.enabled && student.studentId) {
            const config = frontPlaceholders.studentId;
            drawText(ctx, student.studentId, config, frontImage.width, frontImage.height);
        }

        // Draw batch
        if (frontPlaceholders.batch?.enabled && student.batch?.name) {
            const config = frontPlaceholders.batch;
            drawText(ctx, student.batch.name, config, frontImage.width, frontImage.height);
        }

        // Draw roll number
        if (frontPlaceholders.rollNumber?.enabled && student.rollNumber) {
            const config = frontPlaceholders.rollNumber;
            drawText(ctx, `Roll: ${student.rollNumber}`, config, frontImage.width, frontImage.height);
        }

        // Draw admission date
        if (frontPlaceholders.dateOfAdmission?.enabled && student.dateOfAdmission) {
            const config = frontPlaceholders.dateOfAdmission;
            const date = new Date(student.dateOfAdmission).toLocaleDateString();
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
        const backImage = await loadImage(template.backImageUrl);
        
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
            const qrDataUrl = await generateQRCode(student._id.toString());
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
    const x = (config.x / 100) * canvasWidth;
    const y = (config.y / 100) * canvasHeight;
    const fontSize = Math.round((config.fontSize / 100) * canvasWidth);

    ctx.font = `${config.fontWeight === "bold" ? "bold " : ""}${fontSize}px "${config.fontFamily}"`;
    ctx.fillStyle = config.color || "#000000";
    ctx.textAlign = config.textAlign || "center";
    ctx.textBaseline = "middle";

    ctx.fillText(text || "", x, y);
}

/**
 * Helper: Draw image on canvas
 */
function drawImage(ctx, image, config, canvasWidth, canvasHeight) {
    const x = (config.x / 100) * canvasWidth;
    const y = (config.y / 100) * canvasHeight;
    const width = (config.width / 100) * canvasWidth;
    const height = (config.height / 100) * canvasHeight;

    ctx.drawImage(image, x, y, width, height);
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
