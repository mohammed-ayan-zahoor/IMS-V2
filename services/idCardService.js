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
 * Validates and logs student data structure for debugging
 */
function validateStudentData(student, templateName = "Unknown") {
    const issues = [];
    const warnings = [];
    
    // Check if student has required structure
    if (!student) {
        issues.push("Student object is null or undefined");
        return { valid: false, issues, warnings };
    }
    
    // Check for hydrated context structure
    if (student.student && typeof student.student === 'object') {
        // This is a hydrated context
        if (!student.student.fullName) {
            warnings.push("student.student.fullName is missing");
        }
        if (!student.batch || !student.batch.name) {
            warnings.push("batch.name is missing");
        }
        if (!student.course || !student.course.name) {
            warnings.push("course.name is missing");
        }
    } else if (student.fullName || student.grNumber) {
        // This is a raw student object
        if (!student.fullName && !student.profile?.firstName) {
            warnings.push("Student fullName not found");
        }
    } else {
        issues.push("Student object structure unrecognized");
    }
    
    console.log(`[IDCardService] Template="${templateName}" - Student validation: ${issues.length} errors, ${warnings.length} warnings`);
    if (warnings.length > 0) {
        console.warn(`[IDCardService] Warnings:`, warnings);
    }
    if (issues.length > 0) {
        console.error(`[IDCardService] Issues:`, issues);
    }
    
    return { 
        valid: issues.length === 0, 
        issues, 
        warnings,
        hasHydratedContext: !!(student.student && student.batch && student.course)
    };
}

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
        // Validate student data structure
        const validation = validateStudentData(student, template?.name || "Unknown");
        if (!validation.valid) {
            console.warn(`[IDCardService] Invalid student data for template "${template?.name}"`);
        }
        
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

        let renderedFields = [];
        let missedFields = [];

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
                                   getNestedValue(student, "profilePicture") ||
                                   getNestedValue(student, "student.avatar") ||
                                   getNestedValue(student, "student.profile.avatar");
                    }
                    
                    if (avatarUrl) {
                        try {
                            const resolvedPhotoUrl = resolveImagePath(avatarUrl);
                            const photoImage = await loadImage(resolvedPhotoUrl);
                            drawImage(ctx, photoImage, config, frontImage.width, frontImage.height);
                            renderedFields.push(`${key}(image)`);
                        } catch (photoError) {
                            console.warn(`[IDCardService] Could not load photo: ${avatarUrl}`, photoError.message);
                        }
                    } else {
                        missedFields.push(`${key}(image - no path)`);
                    }
                } else if (config.type === "qr" || key === "qrCode") {
                    try {
                        let qrPayload = student.id || student._id?.toString() || student.student?._id?.toString() || "unknown";
                        if (config.dataMode === "profileUrl") {
                            qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.local"}/profile/${qrPayload}`;
                        } else if (config.dataMode === "vcard") {
                            const firstName = getNestedValue(student, "profile.firstName") || getNestedValue(student, "firstName") || "";
                            const lastName = getNestedValue(student, "profile.lastName") || getNestedValue(student, "lastName") || "";
                            const studentName = `${firstName} ${lastName}`.trim();
                            qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${studentName}\nTITLE:Student\nEND:VCARD`;
                        }
                        const qrDataUrl = await generateQRCode(qrPayload);
                        const qrImage = await loadImage(qrDataUrl);
                        drawImage(ctx, qrImage, config, frontImage.width, frontImage.height);
                        renderedFields.push(`${key}(qr)`);
                    } catch (qrError) {
                        console.warn(`[IDCardService] QR Code generation failed:`, qrError.message);
                        missedFields.push(`${key}(qr - error)`);
                    }
                } else {
                    // Text elements (field or static)
                    let text = "";
                    if (config.type === "static") {
                        text = config.staticText || "";
                        if (text) renderedFields.push(`${key}(static)`);
                    } else {
                        // Dynamic field - priority: config.fieldKey > legacy mapping > key itself
                        let fieldKey = config.fieldKey;
                        if (!fieldKey) {
                            fieldKey = getLegacyFieldKey(key) || key;
                        }
                        
                        if (fieldKey) {
                            const val = getNestedValue(student, fieldKey, key);
                            text = (val !== null && val !== undefined) ? val.toString().trim() : "";
                            
                            if (text && text !== 'N/A') {
                                renderedFields.push(`${key}`);
                            } else {
                                missedFields.push(`${key}(${fieldKey})`);
                            }
                            
                            // Special formatting for specific fields (only if text is not already formatted)
                            const isDateField = ['admissionDate', 'joiningDate', 'dob', 'dateOfBirth', 'createdAt', 'leavingDate'].some(k => fieldKey.toLowerCase().includes(k.toLowerCase()));
                            if (isDateField && val && !text.includes('/')) {
                                try {
                                    const dateObj = new Date(val);
                                    if (!isNaN(dateObj.getTime())) {
                                        text = dateObj.toLocaleDateString('en-GB');
                                    }
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
                missedFields.push(`${key}(error: ${elemError.message})`);
            }
        }
        
        // Log rendering summary
        console.log(`[IDCardService] Front side rendered: ${renderedFields.length} fields rendered, ${missedFields.length} missed`);
        if (missedFields.length > 0 && process.env.NODE_ENV !== 'production') {
            console.debug(`[IDCardService] Missed fields:`, missedFields.join(', '));
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

        let renderedFields = [];
        let missedFields = [];

        for (const [key, config] of placeholders.entries()) {
            if (!config.enabled) continue;

            try {
                if (config.type === "qr" || key === "qrCode") {
                    try {
                        let qrPayload = student.id || student._id?.toString() || student.student?._id?.toString() || "unknown";
                        if (config.dataMode === "profileUrl") {
                            qrPayload = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.local"}/profile/${qrPayload}`;
                        } else if (config.dataMode === "vcard") {
                            const firstName = getNestedValue(student, "profile.firstName") || getNestedValue(student, "firstName") || "";
                            const lastName = getNestedValue(student, "profile.lastName") || getNestedValue(student, "lastName") || "";
                            const studentName = `${firstName} ${lastName}`.trim();
                            const institName = institute?.name || getNestedValue(student, "institute.name") || "";
                            qrPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${studentName}\nORG:${institName}\nTITLE:Student\nEND:VCARD`;
                        }
                        const qrDataUrl = await generateQRCode(qrPayload);
                        const qrImage = await loadImage(qrDataUrl);
                        drawImage(ctx, qrImage, config, backImage.width, backImage.height);
                        renderedFields.push(`${key}(qr)`);
                    } catch (qrError) {
                        console.warn(`[IDCardService] QR Code generation failed:`, qrError.message);
                        missedFields.push(`${key}(qr - error)`);
                    }
                } else if (config.type === "image") {
                    try {
                        const fieldKey = config.fieldKey;
                        const imageUrl = fieldKey ? getNestedValue(student, fieldKey) : null;
                        if (imageUrl) {
                            const resolvedPhotoUrl = resolveImagePath(imageUrl);
                            const photoImage = await loadImage(resolvedPhotoUrl);
                            drawImage(ctx, photoImage, config, backImage.width, backImage.height);
                            renderedFields.push(`${key}(image)`);
                        } else {
                            missedFields.push(`${key}(image - no path)`);
                        }
                    } catch (photoError) {
                        console.warn(`[IDCardService] Could not load image:`, photoError.message);
                        missedFields.push(`${key}(image - error)`);
                    }
                } else {
                    // Text elements
                    let text = "";
                    if (config.type === "static") {
                        text = config.staticText || "";
                        if (text) renderedFields.push(`${key}(static)`);
                    } else if (key === "instituteName") {
                        // Try multiple paths for institute name
                        text = (institute?.name) || 
                               getNestedValue(student, "institute.name") ||
                               getNestedValue(student, "instituteName") || "";
                        if (text) renderedFields.push(`${key}`);
                        else missedFields.push(`${key}(institute.name)`);
                    } else if (key === "validity") {
                        text = calculateValidity();
                        if (text) renderedFields.push(`${key}`);
                    } else if (key === "disclaimer") {
                        text = "This card is valid only when signed by authorized personnel";
                        if (text) renderedFields.push(`${key}`);
                    } else {
                        // Dynamic field
                        let fieldKey = config.fieldKey;
                        if (!fieldKey) {
                            fieldKey = getLegacyFieldKey(key) || key;
                        }
                        
                        if (fieldKey) {
                            const val = getNestedValue(student, fieldKey, key);
                            text = (val !== null && val !== undefined) ? val.toString().trim() : "";
                            
                            if (text && text !== 'N/A') {
                                renderedFields.push(`${key}`);
                            } else {
                                missedFields.push(`${key}(${fieldKey})`);
                            }
                            
                            // Special formatting for dates (only if text is not already formatted)
                            const isDateField = ['admissionDate', 'joiningDate', 'dob', 'dateOfBirth', 'createdAt', 'leavingDate'].some(k => fieldKey.toLowerCase().includes(k.toLowerCase()));
                            if (isDateField && val && !text.includes('/')) {
                                try {
                                    const dateObj = new Date(val);
                                    if (!isNaN(dateObj.getTime())) {
                                        text = dateObj.toLocaleDateString('en-GB');
                                    }
                                } catch (e) {}
                            }
                        }
                    }

                    if (text && text !== 'N/A') {
                        drawText(ctx, text, config, backImage.width, backImage.height);
                    }
                }
            } catch (elemError) {
                console.warn(`[IDCardService] Error rendering element ${key}:`, elemError.message);
                missedFields.push(`${key}(error: ${elemError.message})`);
            }
        }
        
        // Log rendering summary
        console.log(`[IDCardService] Back side rendered: ${renderedFields.length} fields rendered, ${missedFields.length} missed`);
        if (missedFields.length > 0 && process.env.NODE_ENV !== 'production') {
            console.debug(`[IDCardService] Missed fields:`, missedFields.join(', '));
        }

        return canvas;
    } catch (error) {
        console.error("[IDCardService] Error rendering back:", error);
        throw error;
    }
}

/**
 * Helper to get nested value from object with fallback to root level and student context
 * Handles both direct student objects and hydrated context from certificateService
 */
function getNestedValue(obj, path, debugKey = null) {
    if (!path || !obj) return null;
    
    // Handle edge case: if path is empty string
    if (typeof path !== 'string' || path.trim() === '') return null;
    
    path = path.trim();
    
    // 1. Try direct path (standard resolution) at root level
    let value = path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[part];
    }, obj);
    
    if (value !== undefined && value !== null && value !== '') return value;
    
    // 2. Try in student context (handles hydrated context from certificateService)
    // The hydrated context has structure: { student: {...}, batch: {...}, course: {...}, institute: {...} }
    if (obj.student && typeof obj.student === 'object') {
        // First try the path directly in student
        value = path.split('.').reduce((acc, part) => {
            if (acc === null || acc === undefined) return undefined;
            return acc[part];
        }, obj.student);
        if (value !== undefined && value !== null && value !== '') return value;

        // Try without the "student." prefix if the path starts with it
        if (path.startsWith('student.')) {
            const subPath = path.substring(8);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.student);
            if (value !== undefined && value !== null && value !== '') return value;
        }
    }
    
    // 3. Try batch context (for batch.name and batchName)
    if (obj.batch && typeof obj.batch === 'object') {
        if (path.startsWith('batch.')) {
            const subPath = path.substring(6);
            value = subPath.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) return undefined;
                return acc[part];
            }, obj.batch);
            if (value !== undefined && value !== null && value !== '') return value;
        } else {
            // Try direct match in batch (e.g., path="name" should check batch.name)
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

    // 6. Try common student profile paths (if not hydrated)
    if (obj.profile && typeof obj.profile === 'object') {
        const profileValue = obj.profile[path] || getNestedValue(obj.profile, path);
        if (profileValue !== undefined && profileValue !== null && profileValue !== '') return profileValue;
    }

    // 7. Fallback for root level keys
    if (obj[path] !== undefined && obj[path] !== null) {
        return obj[path];
    }
    
    // Log missing field for debugging
    if (debugKey) {
        console.warn(`[IDCardService] Field not found: key="${debugKey}", path="${path}"`);
    }
    
    return null;
}

/**
 * Legacy field mapping - Maps template field keys to actual data paths
 * Supports both root level and nested properties
 * Based on hydrated context structure from certificateService
 */
function getLegacyFieldKey(key) {
    const mapping = {
        // ============= BASIC STUDENT INFO =============
        studentName: "student.fullName",
        fullName: "student.fullName",
        name: "student.fullName",
        firstName: "student.firstName",
        lastName: "student.lastName",
        surname: "student.surname",
        
        // ============= IDENTIFICATION NUMBERS =============
        studentId: "student.grNumber",
        grNumber: "student.grNumber",
        enrollmentNo: "student.enrollmentNo",
        enrollmentNumber: "student.enrollmentNo",
        rollNumber: "student.rollNo",
        rollNo: "student.rollNo",
        id: "student.studentId",
        udiseNo: "student.studentId",
        uidNo: "student.uidNo",
        aadharNo: "student.uidNo",
        aadharNumber: "student.uidNo",
        apaarId: "student.apaarId",
        apaarid: "student.apaarId",
        "apaar id": "student.apaarId",
        penNo: "student.penNo",
        penNumber: "student.penNo",
        
        // ============= ACADEMIC INFO =============
        batch: "batch.name",
        batchName: "batch.name",
        section: "batch.name",
        course: "course.name",
        courseName: "course.name",
        std: "std",
        standard: "std",
        medium: "course.medium",
        academicYear: "academicYear",
        
        // ============= CONTACT & PERSONAL =============
        phone: "student.phone",
        mobile: "student.phone",
        mobileNo: "student.phone",
        contactNo: "student.phone",
        email: "student.email",
        bloodGroup: "student.bloodGroup",
        blood: "student.bloodGroup",
        gender: "student.gender",
        dob: "student.dob",
        dateOfBirth: "student.dob",
        
        // ============= FAMILY INFO =============
        fatherName: "student.fatherName",
        motherName: "student.motherName",
        guardianName: "student.guardianName",
        guardianRelation: "student.guardianRelation",
        fatherPhone: "student.fatherPhone",
        motherPhone: "student.motherPhone",
        guardianPhone: "student.guardianPhone",
        fatherAadhar: "student.fatherAadhar",
        motherAadhar: "student.motherAadhar",
        
        // ============= ADDRESS INFO =============
        address: "student.fullAddress",
        fullAddress: "student.fullAddress",
        street: "student.street",
        city: "student.city",
        state: "student.state",
        pincode: "student.pincode",
        
        // ============= BIRTH PLACE INFO =============
        birthCity: "student.birthCity",
        birthTaluka: "student.birthTaluka",
        birthDistrict: "student.birthDistrict",
        birthState: "student.birthState",
        birthDistrict: "student.birthDistrict",
        birthTaluka: "student.birthTaluka",
        birthCountry: "student.birthCountry",
        birthPlace: "student.fullBirthPlace",
        fullBirthPlace: "student.fullBirthPlace",
        
        // ============= ACADEMIC HISTORY =============
        admissionDate: "student.admissionDate",
        admissionStd: "student.admissionStd",
        joiningDate: "student.joiningDate",
        leavingDate: "student.leavingDate",
        leavingReason: "student.leavingReason",
        lastSchool: "student.lastSchool",
        studyingSince: "student.studyingSince",
        
        // ============= PERSONAL DETAILS =============
        nationality: "student.nationality",
        motherTongue: "student.motherTongue",
        religion: "student.religion",
        caste: "student.caste",
        subCaste: "student.subCaste",
        
        // ============= PERFORMANCE & CONDUCT =============
        progress: "student.progress",
        conduct: "student.conduct",
        remarks: "student.remarks",
        
        // ============= INSTITUTE INFO =============
        instituteName: "institute.name",
        institutePhone: "institute.phone",
        instituteEmail: "institute.email",
        instituteAddress: "institute.address",
        instituteUdise: "institute.udiseNumber",
        udiseNumber: "institute.udiseNumber",
        instituteRegistration: "institute.registrationNumber",
        instituteBoard: "institute.board",
        instituteIndex: "institute.indexNumber",
        
        // ============= CERTIFICATE INFO (if generated from cert context) =============
        certificateNumber: "certificate.number",
        issueDate: "certificate.issueDate",
        certificateDay: "certificate.day",
        certificateMonth: "certificate.month",
        certificateYear: "certificate.year",
        
        // ============= SPECIAL FIELDS =============
        validity: "validity",
        disclaimer: "disclaimer"
    };
    
    // Return the mapping value, or null if not found
    return mapping[key] || null;
}

/**
 * Helper: Draw text on canvas
 */
function drawText(ctx, text, config, canvasWidth, canvasHeight) {
    if (!text) return;
    
    // Coordinates are percentage-based (0-100)
    const x = (config.x / 100) * canvasWidth;
    const y = (config.y / 100) * canvasHeight;
    
    // config.fontSize is an absolute pixel value relative to the 320px wide editor canvas.
    const referenceWidth = 320;
    const fontSize = Math.round((config.fontSize / referenceWidth) * canvasWidth);

    ctx.font = `${config.fontWeight === "bold" ? "bold " : ""}${fontSize}px "${config.fontFamily || 'Roboto'}"`;
    ctx.fillStyle = config.color || "#000000";
    ctx.textAlign = config.textAlign || "left";
    
    // Use top baseline to match CSS 'top' positioning in the editor
    ctx.textBaseline = "top";

    let displayText = String(text);
    if (config.textTransform === "uppercase") {
        displayText = displayText.toUpperCase();
    } else if (config.textTransform === "lowercase") {
        displayText = displayText.toLowerCase();
    } else if (config.textTransform === "capitalize") {
        displayText = displayText.replace(/\b\w/g, char => char.toUpperCase());
    }

    // Alignment adjustment: If textAlign is 'center', x is already the center.
    // If it's 'right', x is the right edge.
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
