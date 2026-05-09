import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, registerFont } from 'canvas';
import Handlebars from 'handlebars';
import pLimit from 'p-limit';
import User from '../models/User.js';
import Institute from '../models/Institute.js';
import Counter from '../models/Counter.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

/**
 * Certificate Service - Handles on-demand certificate PDF generation
 * Supports both Handlebars HTML-based formal documents and canvas image-based certificates
 */

// Concurrency limit for Puppeteer instances
const limit = pLimit(3);

// Register bundled Google Fonts
const fontDir = path.join(process.cwd(), 'public', 'fonts');
const fonts = [
    { family: 'Roboto', path: path.join(fontDir, 'Roboto-Regular.ttf'), weight: 'normal', style: 'normal' },
    { family: 'Roboto', path: path.join(fontDir, 'Roboto-Bold.ttf'), weight: 'bold', style: 'normal' },
    { family: 'Inter', path: path.join(fontDir, 'Inter-Regular.ttf'), weight: 'normal', style: 'normal' },
    { family: 'Inter', path: path.join(fontDir, 'Inter-Bold.ttf'), weight: 'bold', style: 'normal' },
    { family: 'Lora', path: path.join(fontDir, 'Lora-Regular.ttf'), weight: 'normal', style: 'normal' },
    { family: 'Lora', path: path.join(fontDir, 'Lora-Bold.ttf'), weight: 'bold', style: 'normal' }
];

fonts.forEach(font => {
    try {
        if (fs.existsSync(font.path)) {
            registerFont(font.path, { family: font.family, weight: font.weight, style: font.style });
        }
    } catch (error) {
        console.warn(`⚠ Could not register font ${font.family}: ${error.message}`);
    }
});

// Custom Handlebars Helpers
Handlebars.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
});

Handlebars.registerHelper('toUpperCase', (str) => {
    return typeof str === 'string' ? str.toUpperCase() : str;
});

/**
 * Hydration Engine - Resolves and flattens all data for a document
 */
export const getHydratedContext = async (studentId, instituteId, options = {}) => {
    const [student, institute] = await Promise.all([
        User.findById(studentId),
        Institute.findById(instituteId)
    ]);

    if (!student || !institute) {
        throw new Error('Student or Institute not found for hydration');
    }

    // Attempt to resolve course/batch data if provided or if student is active
    let courseName = options.courseName || 'N/A';
    let batchName = options.batchName || 'N/A';

    if (options.batchId) {
        const Batch = (await import('../models/Batch.js')).default;
        const batch = await Batch.findById(options.batchId).populate('course');
        if (batch) {
            batchName = batch.name;
            courseName = batch.course?.name || courseName;
        }
    }

    const context = {
        student: {
            id: student._id,
            firstName: student.profile?.firstName || 'N/A',
            lastName: student.profile?.lastName || 'N/A',
            surname: student.profile?.lastName || 'N/A', // Alias
            fullName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(),
            email: student.email || 'N/A',
            phone: student.profile?.phone || 'N/A',
            gender: student.profile?.gender || 'N/A',
            bloodGroup: student.profile?.bloodGroup || 'N/A',
            
            // Address
            street: student.profile?.address?.street || 'N/A',
            city: student.profile?.address?.city || 'N/A',
            state: student.profile?.address?.state || 'N/A',
            pincode: student.profile?.address?.pincode || 'N/A',
            fullAddress: student.profile?.address ? `${student.profile.address.street || ''}, ${student.profile.address.city || ''}`.trim() : 'N/A',

            // Parents
            fatherName: student.fatherName || student.profile?.fatherName || 'N/A',
            fatherPhone: student.fatherPhone || 'N/A',
            fatherAadhar: student.fatherAadhar || 'N/A',
            motherName: student.motherName || student.profile?.motherName || 'N/A',
            motherPhone: student.motherPhone || 'N/A',
            motherAadhar: student.motherAadhar || 'N/A',
            
            // Guardian
            guardianName: student.guardianDetails?.name || 'N/A',
            guardianPhone: student.guardianDetails?.phone || 'N/A',
            guardianRelation: student.guardianDetails?.relation || 'N/A',

            // Personal
            nationality: student.nationality || 'Indian',
            motherTongue: student.motherTongue || 'N/A',
            religion: student.religion || 'N/A',
            caste: student.caste || 'N/A',
            subCaste: student.subCaste || 'N/A',
            medium: student.medium || (options.batchId ? null : 'N/A'), // Will be filled below if missing

            // Birth Place
            birthCity: student.placeOfBirth?.city || 'N/A',
            birthTaluka: student.placeOfBirth?.taluka || 'N/A',
            birthDistrict: student.placeOfBirth?.district || 'N/A',
            birthState: student.placeOfBirth?.state || 'N/A',
            birthCountry: student.placeOfBirth?.country || 'India',
            fullBirthPlace: student.placeOfBirth ? `${student.placeOfBirth.city || ''} ${student.placeOfBirth.state || ''}`.trim() : 'N/A',

            // Identifiers
            grNumber: student.grNumber || 'N/A',
            enrollmentNo: student.enrollmentNumber || 'N/A',
            rollNo: student.rollNo || 'N/A',
            studentId: student.studentIdUdise || 'N/A',
            uidNo: student.aadharNumber || 'N/A',
            apaarId: student.apaarId || 'N/A',
            penNo: student.penNumber || 'N/A',

            // Academic
            lastSchool: student.lastSchoolAttended || 'N/A',
            admissionDate: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : 'N/A',
            joiningDate: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : 'N/A', // Alias
            admissionStd: student.admissionStd || 'N/A',
            leavingDate: student.leavingDate ? new Date(student.leavingDate).toLocaleDateString('en-GB') : 'N/A',
            leavingReason: student.leavingReason || 'N/A',
            studyingSince: student.studyingSinceStandard || 'N/A',
            
            // Date components for DOB
            dob: student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth).toLocaleDateString('en-GB') : 'N/A',
            dobDay: student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth).getDate() : '',
            dobMonth: student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth).getMonth() + 1 : '',
            dobYear: student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth).getFullYear() : '',
            dobWords: 'N/A', // Potentially add a helper for this later

            // Performance
            progress: student.progress || 'Good',
            conduct: student.conduct || 'Good',
            remarks: student.remarks || 'N/A',

            // School specific aliases
            std: courseName,
            section: batchName
        },
        course: {
            name: courseName,
            medium: 'N/A' // Filled below if available
        },
        batch: {
            name: batchName
        },
        // Root level aliases
        std: courseName,
        section: batchName,
        
        institute: {
            name: institute.name,
            address: institute.address ? `${institute.address.street || ''}, ${institute.address.city || ''}` : 'N/A',
            logo: institute.branding?.logo || '',
            udiseNumber: institute.udiseNumber || 'N/A',
            registrationNumber: institute.registrationNumber || 'N/A',
            board: institute.board || 'N/A',
            indexNumber: institute.indexNumber || 'N/A',
            phone: institute.contactPhone || 'N/A',
            email: institute.contactEmail || 'N/A'
        },
        certificate: {
            number: options.serialNumber || 'PREVIEW/0000',
            issueDate: new Date().toLocaleDateString('en-GB'),
            day: new Date().getDate().toString().padStart(2, '0'),
            month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
            year: new Date().getFullYear().toString(),
            isDuplicate: options.isDuplicate || false,
            category: options.category || 'GENERAL'
        },
        academicYear: options.academicYear || new Date().getFullYear().toString(),
        metadata: {
            leavingReason: options.metadata?.leavingReason || student.leavingReason || "N/A",
            leavingDate: options.metadata?.leavingDate || (student.leavingDate ? new Date(student.leavingDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
            conduct: options.metadata?.conduct || student.conduct || 'Good',
            progress: options.metadata?.progress || student.progress || 'Good',
            remarks: options.metadata?.remarks || student.remarks || 'N/A',
            ...options.metadata
        }
    };

    // Fill medium if available from course
    if (options.batchId) {
        const Batch = (await import('../models/Batch.js')).default;
        const batch = await Batch.findById(options.batchId).populate('course');
        if (batch?.course) {
            context.course.medium = batch.course.medium || 'N/A';
            if (!context.student.medium || context.student.medium === 'N/A') {
                context.student.medium = batch.course.medium || 'N/A';
            }
        }
    }

    return context;
};

/**
 * Atomic Serial Number Generator
 */
export const getNextSerialNumber = async (instituteId, category, academicYear) => {
    const counterId = `cert_${instituteId}_${category}_${academicYear}`;
    const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const prefix = category.substring(0, 2).toUpperCase();
    const paddedSeq = String(counter.seq).padStart(4, '0');
    return `${prefix}/${academicYear}/${paddedSeq}`;
};

/**
 * Rendering Engine - Puppeteer with Handlebars
 */
export const renderHtmlToPdf = async (htmlTemplate, cssContent, context, pageConfig = {}, sharedBrowser = null) => {
    return limit(async () => {
        let browser = sharedBrowser;
        let shouldCloseBrowser = false;
        try {
            if (!browser) {
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                shouldCloseBrowser = true;
            }

            const page = await browser.newPage();
            
            // Compile Handlebars
            const template = Handlebars.compile(htmlTemplate);
            const injectedHtml = template(context);

            const finalHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        html, body { 
                            margin: 0; 
                            padding: 0; 
                            background: white; 
                            width: 100%;
                            height: 100%;
                            -webkit-print-color-adjust: exact; 
                        }
                        .page {
                            position: relative;
                            width: ${pageConfig.orientation === 'portrait' ? '210mm' : '297mm'};
                            height: ${pageConfig.orientation === 'portrait' ? '297mm' : '210mm'};
                            padding: ${pageConfig.margins?.top || 15}mm ${pageConfig.margins?.right || 15}mm ${pageConfig.margins?.bottom || 15}mm ${pageConfig.margins?.left || 15}mm;
                            box-sizing: border-box;
                            overflow: hidden;
                        }
                        ${cssContent || ''}
                        @page {
                            size: ${pageConfig.size || 'A4'} ${pageConfig.orientation || 'portrait'};
                            margin: 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="page">
                        ${injectedHtml}
                        ${context.certificate.isDuplicate ? '<div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:120px; color:rgba(0,0,0,0.1); pointer-events:none; z-index:999; font-weight:bold; white-space:nowrap;">DUPLICATE</div>' : ''}
                    </div>
                </body>
                </html>
            `;

            await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: pageConfig.size || 'A4',
                landscape: pageConfig.orientation === 'landscape',
                printBackground: true,
                margin: {
                    top: '0px',
                    bottom: '0px',
                    left: '0px',
                    right: '0px'
                }
            });

            return pdfBuffer;
        } finally {
            if (browser && shouldCloseBrowser) await browser.close();
        }
    });
};

/**
 * High-Level Issuance Logic
 * Handles serial numbering, snapshotting, and database persistence
 */
export const issueCertificate = async (studentId, instituteId, templateId, options = {}) => {
    const Certificate = (await import('../models/Certificate.js')).default;
    const CertificateTemplate = (await import('../models/CertificateTemplate.js')).default;

    const template = await CertificateTemplate.findById(templateId);
    if (!template) throw new Error('Template not found');

    const academicYear = options.academicYear || new Date().getFullYear().toString();
    const isDuplicate = options.isDuplicate || false;
    
    let serialNumber;
    let originalCertificateId = null;

    // 1. Check for existing certificate of the same category for this student
    // Formal documents (LC, TC, etc.) usually have one "Original" ever.
    const existingCert = await Certificate.findOne({
        studentId,
        institutionId: instituteId,
        templateId: template._id,
        status: { $ne: 'REVOKED' }
    }).sort({ createdAt: 1 });

    if (existingCert) {
        if (!isDuplicate) {
            throw new Error(`An active certificate for ${template.category} already exists for this student (SN: ${existingCert.certificateNumber}). Use 'Issue Duplicate' instead.`);
        }
        // For duplicates, we REUSE the serial number
        serialNumber = existingCert.certificateNumber;
        originalCertificateId = existingCert._id;
    } else {
        // New issuance - generate atomic serial number
        serialNumber = await getNextSerialNumber(instituteId, template.category, academicYear);
    }

    // 2. Create Template Snapshot
    const snapshot = {
        htmlTemplate: template.htmlTemplate,
        cssContent: template.cssContent,
        pageConfig: template.pageConfig,
        renderMode: template.renderMode,
        imageUrl: template.imageUrl,
        placeholders: template.placeholders,
        category: template.category // Store category in snapshot too
    };

    // 3. Create Certificate Record
    const certificate = await Certificate.create({
        studentId,
        institutionId: instituteId,
        batchId: options.batchId || null,
        certificateNumber: serialNumber,
        template: {
            templateId: template._id,
            templateName: template.name,
            category: template.category
        },
        snapshot: snapshot,
        metadata: options.metadata || {},
        academicYear,
        isDuplicate,
        originalCertificateId,
        status: 'GENERATED',
        visibleToStudent: options.visibleToStudent || false
    });

    // 4. Generate and Upload to Cloudinary (Persistence)
    try {
        const pdfBuffer = await generateCertificatePDFFromTemplate(certificate, options.browser);
        const uploadResult = await uploadToCloudinary(pdfBuffer, `certificates/${instituteId}/${studentId}`);
        
        if (uploadResult?.secure_url) {
            certificate.pdfUrl = uploadResult.secure_url;
            await certificate.save();
        }
    } catch (uploadError) {
        console.error("Failed to upload certificate to Cloudinary:", uploadError);
        // We don't throw here to avoid failing the whole issuance if only upload fails,
        // but the record exists so it can be retried/regenerated later.
    }

    return certificate;
};

export const generateCertificatePDFFromTemplate = async (certificateData, browser = null) => {
    // Use the snapshot if available, otherwise use the current template
    const source = certificateData.snapshot || certificateData.template;
    
    if (!source) {
        throw new Error('No template source (snapshot or current) found for generation');
    }

    // If it's a formal document (HTML)
    if (source.renderMode === 'HTML_TEMPLATE') {
        const context = await getHydratedContext(certificateData.studentId, certificateData.institutionId, {
            serialNumber: certificateData.certificateNumber,
            metadata: certificateData.metadata,
            academicYear: certificateData.academicYear,
            isDuplicate: certificateData.isDuplicate
        });
        return renderHtmlToPdf(source.htmlTemplate, source.cssContent, context, source.pageConfig, browser);
    }

    // Original Canvas-based logic for Creative Certificates
    try {
        const image = await loadImage(source.imageUrl);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const referenceWidth = 1000;
        const scaleRatio = image.width / referenceWidth;

        const placeholderEntries = source.placeholders instanceof Map 
            ? Array.from(source.placeholders.entries()) 
            : Object.entries(source.placeholders);

        placeholderEntries.forEach(([key, p]) => {
            if (!p.enabled) return;
            // Map hydration keys to placeholder values
            const text = p.type === 'static' ? p.staticText : (certificateData.metadata[p.fieldKey] || certificateData.metadata[key] || "");
            
            const x = (p.x / 100) * image.width;
            const y = (p.y / 100) * image.height;
            const scaledFontSize = Math.round((p.fontSize || 24) * scaleRatio);
            
            ctx.font = `${p.fontStyle === 'italic' ? 'italic ' : ''}${p.fontWeight === 'bold' ? 'bold ' : ''}${scaledFontSize}px "${p.fontFamily || 'Roboto'}"`;
            ctx.fillStyle = p.color || '#000000';
            ctx.textAlign = p.textAlign || 'center';
            ctx.fillText(String(text), x, y);
        });

        const pngBuffer = canvas.toBuffer('image/png');
        
        // Return a promise that resolves to the PDF buffer
        return (async () => {
            let localBrowser = browser;
            let shouldClose = false;
            
            if (!localBrowser) {
                localBrowser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
                shouldClose = true;
            }

            try {
                const page = await localBrowser.newPage();
                await page.setContent(`<img src="data:image/png;base64,${pngBuffer.toString('base64')}" style="width:100%" />`, { waitUntil: 'networkidle0' });
                return await page.pdf({ format: 'A4', landscape: true });
            } finally {
                if (localBrowser && shouldClose) await localBrowser.close();
            }
        })();
    } catch (error) {
        throw new Error(`Failed image overlay: ${error.message}`);
    }
};

/**
 * Legacy wrapper for the old generateCertificatePDF function
 */
export const generateCertificatePDF = async (certData) => {
    // If it's old data without a template ID, we might need a default template
    // For now, redirect to the new issuing logic or handle as error
    console.warn('Legacy generateCertificatePDF called. This should be replaced with issueCertificate.');
    throw new Error('Legacy generateCertificatePDF is deprecated. Use issueCertificate instead.');
};

export const generateCertificateFilename = (certificateNumber, studentName) => {
    const timestamp = Date.now();
    const cleanName = studentName.replace(/\s+/g, '-').toLowerCase();
    return `certificate-${cleanName}-${certificateNumber}-${timestamp}.pdf`;
};
