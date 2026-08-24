import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { connectDB } from '../lib/mongodb.js';



import OfflineExamResult from '../models/OfflineExamResult.js';
import OfflineExam from '../models/OfflineExam.js';
import Institute from '../models/Institute.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import '../models/Course.js';
import '../models/Batch.js';
import '../models/Subject.js';


/**
 * Generates the clean, deterministic A4 HTML template for the official statement of marks.
 */
export function buildMarksheetHtml(data) {
    const {
        institute,
        student,
        exam,
        batch,
        session,
        marks,
        aggregates,
        coScholastic,
        qrCodeDataUrl,
        documentId,
        verificationUrl,
        issueDate
    } = data;

    const primaryColor = institute.branding?.primaryColor || '#1e3a8a';

    const subjectRows = marks.map((sub, idx) => {
        const isPassed = sub.passingMarks != null && sub.obtainedMarks != null
            ? sub.obtainedMarks >= sub.passingMarks
            : true;
        const statusText = sub.isAbsent ? 'ABSENT' : (isPassed ? 'PASS' : 'FAIL');
        const statusColor = sub.isAbsent ? '#b91c1c' : (isPassed ? '#15803d' : '#b91c1c');

        return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #0f172a;">
                    ${sub.subjectName}
                    ${sub.subjectCode ? `<span style="font-size: 9px; font-weight: normal; color: #64748b; margin-left: 4px;">(${sub.subjectCode})</span>` : ''}
                </td>
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; font-weight: 600; color: #334155;">${sub.maxMarks ?? '-'}</td>
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; color: #475569;">${sub.passingMarks ?? '-'}</td>
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 12px; font-weight: 800; color: #0f172a;">
                    ${sub.isAbsent ? '<span style="color:#dc2626;">AB</span>' : (sub.obtainedMarks ?? 0)}
                    ${sub.graceMarks > 0 ? `<span style="font-size: 9px; color: #2563eb; margin-left: 2px;">(+${sub.graceMarks})</span>` : ''}
                </td>
                <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: 800; color: ${statusColor};">${statusText}</td>
            </tr>
        `;
    }).join('');

    const coScholasticSection = coScholastic && coScholastic.length > 0 ? `
        <div style="margin-top: 12px; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 6px;">Co-Scholastic & Personal Evaluation</div>
            <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                ${coScholastic.map(c => `
                    <div style="font-size: 10px; color: #334155;">
                        <span style="font-weight: 600;">${c.paramName}:</span>
                        <strong style="color: ${primaryColor}; margin-left: 4px; font-size: 11px;">${c.rating}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    const isPass = aggregates.overallResult === 'pass';
    const resultBadgeColor = isPass ? '#15803d' : '#b91c1c';
    const resultBadgeBg = isPass ? '#dcfce7' : '#fee2e2';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Marksheet - ${student.name} (${student.enrollmentNumber})</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0f172a;
            width: 210mm;
            height: 297mm;
        }
        .page-container {
            width: 210mm;
            height: 297mm;
            padding: 12mm 14mm;
            position: relative;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .outer-border {
            border: 3px double #1e293b;
            padding: 8mm 10mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: #ffffff;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            pointer-events: none;
            z-index: 1;
            text-align: center;
            opacity: 0.045;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .watermark-img {
            transform: rotate(30deg);
            width: 320px;
            height: 320px;
            object-fit: contain;
            filter: grayscale(100%);
        }
        .watermark-text {
            font-size: 52px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 6px;
            white-space: nowrap;
            line-height: 1.3;
        }
        .content-layer {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="outer-border">
            <div class="watermark">
                ${institute.logo ? `
                    <img src="${institute.logo}" alt="" class="watermark-img">
                ` : `
                    <div class="watermark-text">
                        ${institute.name}<br>OFFICIAL TRANSCRIPT
                    </div>
                `}
            </div>

            <div class="content-layer">
                <!-- TOP HEADER -->
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
                        ${institute.logo ? `
                            <div style="width: 75px; height: 75px; display: flex; align-items: center; justify-content: center;">
                                <img src="${institute.logo}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                            </div>
                        ` : `
                            <div style="width: 65px; height: 65px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                                🎓
                            </div>
                        `}

                        <div style="text-align: center; flex: 1; padding: 0 16px;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
                                ${institute.name}
                            </h1>
                            ${institute.address?.city ? `
                                <p style="margin: 3px 0 0; font-size: 10px; color: #475569; font-weight: 500;">
                                    ${[institute.address.street, institute.address.city, institute.address.state, institute.address.pincode].filter(Boolean).join(', ')}
                                </p>
                            ` : ''}
                            <p style="margin: 2px 0 0; font-size: 9px; color: #64748b;">
                                ${[institute.phone ? `Phone: ${institute.phone}` : '', institute.email ? `Email: ${institute.email}` : ''].filter(Boolean).join(' | ')}
                            </p>
                        </div>

                        <div style="text-align: right; width: 85px;">
                            <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b;">Institution Code</div>
                            <div style="font-size: 11px; font-weight: 900; font-family: monospace; color: #0f172a;">${institute.code || 'INST'}</div>
                            <div style="margin-top: 6px; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b;">Session</div>
                            <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${session.name}</div>
                        </div>
                    </div>

                    <!-- STATEMENT TITLE BADGE -->
                    <div style="text-align: center; margin: 12px 0 10px;">
                        <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 18px; border-radius: 4px; font-size: 12px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                            STATEMENT OF MARKS
                        </div>
                        <div style="font-size: 11px; font-weight: 800; color: ${primaryColor}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${exam.title} (${exam.type.toUpperCase()})
                        </div>
                    </div>

                    <!-- STUDENT BIO TABLE -->
                    <table style="width: 100%; border: 1px solid #cbd5e1; margin-bottom: 12px; background: #f8fafc; font-size: 10px;">
                        <tr>
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b; width: 18%;">Student Name:</td>
                            <td style="padding: 5px 8px; font-weight: 800; color: #0f172a; width: 32%; text-transform: uppercase;">${student.name}</td>
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b; width: 18%;">Enrollment No:</td>
                            <td style="padding: 5px 8px; font-weight: 800; color: #0f172a; width: 32%; font-family: monospace; font-size: 11px;">${student.enrollmentNumber}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e2e8f0;">
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b;">Course / Class:</td>
                            <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">${exam.courseName}</td>
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b;">Batch / Section:</td>
                            <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">${batch.name}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e2e8f0;">
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b;">Date of Birth:</td>
                            <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">${student.dateOfBirth || '-'}</td>
                            <td style="padding: 5px 8px; font-weight: 600; color: #64748b;">Guardian Name:</td>
                            <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">${student.guardianName || '-'}</td>
                        </tr>
                    </table>

                    <!-- SUBJECT MARKS TABLE -->
                    <table style="width: 100%; border: 1px solid #94a3b8;">
                        <thead>
                            <tr style="background: #1e293b; color: #ffffff;">
                                <th style="padding: 7px 8px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 6%;">#</th>
                                <th style="padding: 7px 10px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: left;">Subject Details</th>
                                <th style="padding: 7px 8px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 14%;">Max Marks</th>
                                <th style="padding: 7px 8px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 14%;">Min Pass</th>
                                <th style="padding: 7px 8px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 16%;">Obtained</th>
                                <th style="padding: 7px 8px; border: 1px solid #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 12%;">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjectRows}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f1f5f9; border-top: 2px solid #475569; font-weight: 800;">
                                <td colspan="2" style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 11px; text-transform: uppercase;">
                                    Grand Total:
                                </td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">
                                    ${aggregates.totalMaxMarks}
                                </td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; color: #64748b;">
                                    -
                                </td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 13px; font-weight: 900; color: #0f172a;">
                                    ${aggregates.totalObtainedMarks}
                                </td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">
                                    ${aggregates.percentage ? `${aggregates.percentage.toFixed(1)}%` : '-'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    ${coScholasticSection}

                    <!-- PERFORMANCE SUMMARY CARD -->
                    <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #ffffff; border: 2px solid #cbd5e1; border-radius: 8px;">
                        <div style="display: flex; gap: 24px; font-size: 11px;">
                            <div>
                                <span style="color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; display: block;">Percentage</span>
                                <strong style="font-size: 14px; color: #0f172a;">${aggregates.percentage ? `${aggregates.percentage.toFixed(2)}%` : '-'}</strong>
                            </div>
                            <div>
                                <span style="color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; display: block;">Overall Grade</span>
                                <strong style="font-size: 14px; color: #0f172a;">${aggregates.overallGrade || '-'}</strong>
                            </div>
                            ${aggregates.rank != null ? `
                                <div>
                                    <span style="color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; display: block;">Rank in Batch</span>
                                    <strong style="font-size: 14px; color: #2563eb;">#${aggregates.rank}</strong>
                                </div>
                            ` : ''}
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="padding: 6px 16px; border-radius: 6px; background: ${resultBadgeBg}; color: ${resultBadgeColor}; font-size: 13px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; border: 1px solid ${resultBadgeColor};">
                                RESULT: ${aggregates.overallResult.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FOOTER & SIGNATURES LAYER -->
                <div style="margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                    <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                        <!-- QR Code & Security Hash -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${qrCodeDataUrl ? `
                                <img src="${qrCodeDataUrl}" alt="QR Verification" style="width: 58px; height: 58px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #ffffff;">
                            ` : ''}
                            <div style="font-size: 8px; color: #64748b; line-height: 1.3; max-width: 170px;">
                                <strong style="color: #0f172a; display: block; font-size: 9px;">AUTHENTIC DIGITAL RECORD</strong>
                                Scan QR code to verify validity on official institute registry.<br>
                                Doc ID: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${documentId}</span>
                            </div>
                        </div>

                        <!-- Formal Signatures -->
                        <div style="display: flex; gap: 28px; text-align: center; font-size: 9px; color: #475569; font-weight: 600;">
                            <div>
                                <div style="width: 90px; border-bottom: 1px solid #475569; margin-bottom: 4px;"></div>
                                Class Teacher
                            </div>
                            <div>
                                <div style="width: 110px; border-bottom: 1px solid #475569; margin-bottom: 4px;"></div>
                                Controller of Exams
                            </div>
                            <div>
                                <div style="width: 90px; border-bottom: 1px solid #475569; margin-bottom: 4px;"></div>
                                Principal
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 6px; font-size: 7.5px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                        This statement of marks is computer generated and certified by the institution. Date of Issue: ${issueDate}.
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Hydrates data from DB and generates marksheet payload
 */
export async function getMarksheetContext(resultId, baseUrl = 'http://localhost:3000') {
    await connectDB();

    const result = await OfflineExamResult.findById(resultId)
        .populate({
            path: 'exam',
            populate: [
                { path: 'course', select: 'name code' },
                { path: 'session', select: 'sessionName' },
                { path: 'subjects.subject', select: 'name code' },
                { path: 'institute' }
            ]
        })
        .populate('student')
        .populate('batch', 'name')
        .populate('marks.subject', 'name code');

    if (!result) {
        throw new Error('Marksheet record not found.');
    }

    const exam = result.exam || {};
    const institute = exam.institute || {};
    const student = result.student || {};
    const batch = result.batch || {};
    const session = exam.session || {};

    const documentId = `MS-${result._id.toString().slice(-8).toUpperCase()}`;
    const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify/marksheet/${result._id}`;

    // Generate QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 150,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        }
    });

    // Map subject metadata
    const subjectMap = new Map();
    if (Array.isArray(exam.subjects)) {
        exam.subjects.forEach(s => {
            const subId = String(s.subject?._id || s.subject);
            subjectMap.set(subId, {
                maxMarks: s.maxMarks,
                passingMarks: s.passingMarks,
                examDate: s.examDate
            });
        });
    }

    const formattedMarks = (result.marks || []).map(m => {
        const subId = String(m.subject?._id || m.subject);
        const meta = subjectMap.get(subId) || {};
        return {
            subjectName: m.subject?.name || 'Subject',
            subjectCode: m.subject?.code || '',
            maxMarks: meta.maxMarks ?? null,
            passingMarks: meta.passingMarks ?? null,
            obtainedMarks: m.obtainedMarks,
            isAbsent: m.isAbsent,
            isNotAppeared: m.isNotAppeared,
            graceMarks: m.graceMarks || 0,
            remarks: m.remarks || ''
        };
    });

    const studentDob = student.profile?.dateOfBirth;
    const formattedDob = studentDob
        ? new Date(studentDob).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '-';

    return {
        institute: {
            id: institute._id,
            name: institute.name || 'Educational Institution',
            code: institute.code || '',
            logo: institute.branding?.logo || null,
            address: institute.address || null,
            phone: institute.contactPhone || null,
            email: institute.contactEmail || null,
            branding: institute.branding || {}
        },
        student: {
            id: student._id,
            name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || 'Student',
            enrollmentNumber: student.enrollmentNumber || 'N/A',
            dateOfBirth: formattedDob,
            guardianName: student.guardianDetails?.name || null
        },
        exam: {
            id: exam._id,
            title: exam.title || 'Examination',
            type: exam.examType || 'custom',
            courseName: exam.course?.name || 'General Course'
        },
        batch: {
            id: batch._id,
            name: batch.name || 'Standard Batch'
        },
        session: {
            name: session.sessionName || 'Academic Session'
        },
        marks: formattedMarks,
        aggregates: {
            totalObtainedMarks: result.totalObtainedMarks || 0,
            totalMaxMarks: result.totalMaxMarks || 0,
            percentage: result.percentage || 0,
            overallGrade: result.overallGrade || '-',
            rank: result.rank || null,
            overallResult: result.overallResult || 'pass'
        },
        coScholastic: result.coScholasticRatings || [],
        qrCodeDataUrl,
        documentId,
        verificationUrl,
        issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
}

/**
 * Generates an authentic, high-resolution A4 vector PDF marksheet using PDFKit
 */
export async function generateMarksheetPdfKit(context) {
    return new Promise(async (resolve, reject) => {
        try {
            const qrBuffer = await QRCode.toBuffer(context.verificationUrl, {
                width: 160,
                margin: 0,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            });

            // Fetch school logo buffer for centered watermark if available
            let logoBuffer = null;
            const logoUrl = context.institute.logo || context.institute.branding?.logo;
            if (logoUrl) {
                try {
                    const res = await fetch(logoUrl);
                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        logoBuffer = Buffer.from(arrayBuffer);
                    }
                } catch (err) {
                    console.warn("[PDF Generator] Could not fetch institute logo for watermark:", err.message);
                }
            }

            const doc = new PDFDocument({
                size: 'A4', // 595.28 x 841.89 pt
                margin: 0,
                info: {
                    Title: `Marksheet - ${context.student.name}`,
                    Author: context.institute.name,
                    Subject: `Statement of Marks: ${context.exam.title}`,
                    Keywords: 'marksheet, exam results, transcript'
                }
            });

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                const sanitizedName = (context.student.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
                const sanitizedExam = (context.exam.title || 'marksheet').replace(/[^a-zA-Z0-9]/g, '_');
                const filename = `Marksheet_${sanitizedName}_${sanitizedExam}.pdf`;
                resolve({ pdfBuffer, filename, context });
            });
            doc.on('error', reject);

            const isPass = context.aggregates.overallResult === 'pass';
            const sealColor = isPass ? '#0f766e' : '#dc2626';

            // ── 1. Official Double Border Frame ──
            doc.rect(20, 20, 555.28, 801.89).lineWidth(1.5).stroke('#0f172a');
            doc.rect(23.5, 23.5, 548.28, 794.89).lineWidth(0.5).stroke('#0f172a');

            // ── 1.5. Centered School Logo Watermark ──
            if (logoBuffer) {
                try {
                    doc.save();
                    doc.opacity(0.06);
                    const size = 260;
                    const centerX = (595.28 - size) / 2;
                    const centerY = (841.89 - size) / 2 + 30;
                    doc.image(logoBuffer, centerX, centerY, { width: size, height: size, fit: [size, size], align: 'center', valign: 'center' });
                    doc.restore();
                } catch (e) {
                    console.warn("[PDF Generator] Error rendering logo watermark:", e.message);
                }
            } else {
                doc.save();
                doc.opacity(0.025);
                doc.fontSize(36).font('Helvetica-Bold').fillColor('#0f172a');
                doc.rotate(-32, { origin: [297.64, 450] });
                doc.text((context.institute.name || 'OFFICIAL TRANSCRIPT').toUpperCase(), 45, 430, { width: 505, align: 'center' });
                doc.restore();
            }

            // ── 2. Official Header ──
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f766e').text('OFFICIAL ACADEMIC TRANSCRIPT // EXAMINATION REGISTRY', 40, 42, { align: 'center', characterSpacing: 1.5 });
            doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text((context.institute.name || 'INSTITUTION').toUpperCase(), 40, 55, { align: 'center' });

            const addressParts = [context.institute.address?.street, context.institute.address?.city, context.institute.address?.state].filter(Boolean);
            if (addressParts.length > 0) {
                doc.font('Helvetica').fontSize(9).fillColor('#475569').text(addressParts.join(', '), 40, 80, { align: 'center' });
            }

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`STATEMENT OF MARKS — ${(context.exam.title || 'EXAMINATION').toUpperCase()}`, 40, 96, { align: 'center' });
            doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Academic Session: ${context.session.name || 'Current'} • Issue Date: ${context.issueDate}`, 40, 110, { align: 'center' });

            // ── 3. Candidate Metadata Grid (Ruled Table Format) ──
            const bioY = 132;
            doc.moveTo(35, bioY).lineTo(560.28, bioY).lineWidth(1).stroke('#0f172a');
            doc.moveTo(35, bioY + 42).lineTo(560.28, bioY + 42).lineWidth(1).stroke('#0f172a');

            // 4 Column dividers
            doc.moveTo(166, bioY).lineTo(166, bioY + 42).lineWidth(0.5).stroke('#e2e8f0');
            doc.moveTo(297, bioY).lineTo(297, bioY + 42).lineWidth(0.5).stroke('#e2e8f0');
            doc.moveTo(428, bioY).lineTo(428, bioY + 42).lineWidth(0.5).stroke('#e2e8f0');

            // Col 1: Name
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('CANDIDATE NAME', 42, bioY + 7);
            doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(context.student.name || 'Student', 42, bioY + 20, { width: 120, ellipsis: true });

            // Col 2: Enrollment No
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('ENROLLMENT NO.', 173, bioY + 7);
            doc.font('Courier-Bold').fontSize(10.5).fillColor('#0f172a').text(context.student.enrollmentNumber || '-', 173, bioY + 20);

            // Col 3: Course / Class
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('COURSE / CLASS', 304, bioY + 7);
            doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(context.exam.courseName || '-', 304, bioY + 20, { width: 120, ellipsis: true });


            // Col 4: Batch / Section
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('BATCH / SECTION', 435, bioY + 7);
            doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(context.batch.name || 'Standard', 435, bioY + 20, { width: 120, ellipsis: true });

            // ── 4. Marks Table ──
            const tableY = 192;
            doc.moveTo(35, tableY).lineTo(560.28, tableY).lineWidth(1.5).stroke('#0f172a');
            doc.moveTo(35, tableY + 24).lineTo(560.28, tableY + 24).lineWidth(1).stroke('#0f172a');

            // Table Headers
            doc.font('Courier-Bold').fontSize(8.5).fillColor('#0f172a');
            doc.text('#', 40, tableY + 7, { width: 25, align: 'center' });
            doc.text('SUBJECT DETAILS', 75, tableY + 7, { width: 200, align: 'left' });
            doc.text('MAX MARKS', 285, tableY + 7, { width: 65, align: 'center' });
            doc.text('PASS MARKS', 355, tableY + 7, { width: 65, align: 'center' });
            doc.text('OBTAINED', 425, tableY + 7, { width: 65, align: 'center' });
            doc.text('STATUS', 495, tableY + 7, { width: 60, align: 'center' });

            let currentY = tableY + 24;
            const marksList = context.marks || [];

            marksList.forEach((sub, idx) => {
                const rowH = 24;
                doc.moveTo(35, currentY + rowH).lineTo(560.28, currentY + rowH).lineWidth(0.5).stroke('#e2e8f0');

                doc.font('Courier').fontSize(9).fillColor('#64748b').text((idx + 1).toString(), 40, currentY + 7, { width: 25, align: 'center' });
                
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
                const subName = sub.subjectName || sub.name || 'Subject';
                const subCode = sub.subjectCode || sub.code || '';
                const subLabel = subCode ? `${subName} [${subCode}]` : subName;
                doc.text(subLabel, 75, currentY + 7, { width: 200, ellipsis: true });

                doc.font('Courier').fontSize(9).fillColor('#0f172a').text(sub.maxMarks != null ? String(sub.maxMarks) : '-', 285, currentY + 7, { width: 65, align: 'center' });
                doc.font('Courier').fontSize(9).fillColor('#64748b').text(sub.passingMarks != null ? String(sub.passingMarks) : '-', 355, currentY + 7, { width: 65, align: 'center' });

                const obtainedText = sub.isAbsent ? 'ABSENT' : String(sub.obtainedMarks ?? 0);
                doc.font('Courier-Bold').fontSize(9.5).fillColor(sub.isAbsent ? '#dc2626' : '#0f172a').text(obtainedText, 425, currentY + 7, { width: 65, align: 'center' });

                const isPassed = sub.passingMarks != null && sub.obtainedMarks != null
                    ? (sub.obtainedMarks + (sub.graceMarks || 0)) >= sub.passingMarks
                    : true;
                const statusColor = sub.isAbsent || !isPassed ? '#dc2626' : '#0f766e';
                const statusText = sub.isAbsent ? 'AB' : isPassed ? 'PASS' : 'FAIL';
                doc.font('Courier-Bold').fontSize(8.5).fillColor(statusColor).text(statusText, 495, currentY + 7, { width: 60, align: 'center' });

                currentY += rowH;
            });

            // Total Row
            const totalH = 26;
            doc.moveTo(35, currentY).lineTo(560.28, currentY).lineWidth(1.5).stroke('#0f172a');
            doc.moveTo(35, currentY + totalH).lineTo(560.28, currentY + totalH).lineWidth(1.5).stroke('#0f172a');

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('AGGREGATE TOTAL:', 75, currentY + 8);
            doc.font('Courier-Bold').fontSize(9.5).fillColor('#0f172a').text(String(context.aggregates.totalMaxMarks || 0), 285, currentY + 8, { width: 65, align: 'center' });
            doc.font('Courier').fontSize(9).fillColor('#64748b').text('-', 355, currentY + 8, { width: 65, align: 'center' });
            doc.font('Courier-Bold').fontSize(10.5).fillColor('#0f172a').text(String(context.aggregates.totalObtainedMarks || 0), 425, currentY + 8, { width: 65, align: 'center' });
            doc.font('Courier-Bold').fontSize(9.5).fillColor(sealColor).text(`${(context.aggregates.percentage || 0).toFixed(1)}%`, 495, currentY + 8, { width: 60, align: 'center' });

            currentY += totalH + 20;

            // ── 5. Payoff Summary Strip & Official Stamp ──
            const summaryY = currentY;
            doc.moveTo(35, summaryY).lineTo(560.28, summaryY).lineWidth(2).stroke('#0f766e');

            // Summary Stats Box (Left)
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('PERCENTAGE', 45, summaryY + 10);
            doc.font('Courier-Bold').fontSize(16).fillColor('#0f172a').text(`${(context.aggregates.percentage || 0).toFixed(2)}%`, 45, summaryY + 22);

            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('OVERALL GRADE', 155, summaryY + 10);
            doc.font('Courier-Bold').fontSize(16).fillColor('#0f172a').text(context.aggregates.overallGrade || '-', 155, summaryY + 22);

            if (context.aggregates.rank != null) {
                doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('BATCH RANK', 265, summaryY + 10);
                doc.font('Courier-Bold').fontSize(16).fillColor('#0f766e').text(`#${context.aggregates.rank}`, 265, summaryY + 22);
            }

            // Official Circular Seal Stamp (Vector Rendered, Right Side)
            const stampCenterX = 485;
            const stampCenterY = summaryY + 35;
            const stampRadius = 38;

            doc.save();
            doc.translate(stampCenterX, stampCenterY);
            doc.rotate(-8, { origin: [0, 0] });

            // Double circle
            doc.circle(0, 0, stampRadius).lineWidth(1.5).dash(3, { space: 2 }).stroke(sealColor);
            doc.circle(0, 0, stampRadius - 4).lineWidth(1).undash().stroke(sealColor);

            // Stamp Text
            doc.font('Courier-Bold').fontSize(7).fillColor(sealColor).text('EXAMINATION BOARD', -32, -22, { width: 64, align: 'center', characterSpacing: 1 });
            doc.font('Helvetica-Bold').fontSize(14).fillColor(sealColor).text(isPass ? 'PASSED' : 'FAILED', -34, -7, { width: 68, align: 'center' });
            doc.font('Courier-Bold').fontSize(7.5).fillColor(sealColor).text(context.session.name || '2025–26', -32, 10, { width: 64, align: 'center' });

            doc.restore();

            // ── 6. Verification QR Code & Signatures ──
            const footerY = 705;
            doc.moveTo(35, footerY).lineTo(560.28, footerY).lineWidth(0.5).stroke('#cbd5e1');

            // QR Code (Bottom Left)
            doc.image(qrBuffer, 40, footerY + 12, { width: 56, height: 56 });
            doc.font('Courier-Bold').fontSize(7.5).fillColor('#0f172a').text(`DOC-REF: ${context.documentId}`, 105, footerY + 16);
            doc.font('Helvetica').fontSize(7).fillColor('#64748b').text('Scan to verify authentic record', 105, footerY + 28);
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#0f766e').text(context.verificationUrl, 105, footerY + 40, {
                width: 230,
                link: context.verificationUrl,
                underline: true
            });

            // Signatures (Right Side)
            const sigY = footerY + 50;
            doc.moveTo(340, sigY).lineTo(430, sigY).lineWidth(0.75).stroke('#0f172a');
            doc.font('Helvetica').fontSize(8).fillColor('#475569').text('Class Teacher', 340, sigY + 4, { width: 90, align: 'center' });

            doc.moveTo(460, sigY).lineTo(555, sigY).lineWidth(0.75).stroke('#0f172a');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text('Controller of Exams', 460, sigY + 4, { width: 95, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Main PDF generator handler
 */
export async function generateMarksheetPdf(resultId, baseUrl) {
    const context = await getMarksheetContext(resultId, baseUrl);
    return await generateMarksheetPdfKit(context);
}

