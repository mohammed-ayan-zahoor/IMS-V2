import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import pLimit from "p-limit";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import puppeteer from "puppeteer";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

// Concurrency guard: Prevent DoS by limiting simultaneous LibreOffice conversions
const conversionLimit = pLimit(2);

function sanitizeString(val, maxLen = 200, fallback = '') {
    if (val === undefined || val === null) return fallback;
    const str = String(val).trim();
    // Strip control characters
    const clean = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return clean.slice(0, maxLen);
}

function sanitizeFilename(name) {
    if (!name) return 'MOU_Quantech.pdf';
    const clean = name.replace(/[/\\:*?"<>|\r\n\t]/g, '_').trim();
    return clean.endsWith('.pdf') ? clean : `${clean}.pdf`;
}

function isValidSignature(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    // Must be base64 PNG or JPEG under 2MB
    if (!dataUrl.startsWith('data:image/png;base64,') && !dataUrl.startsWith('data:image/jpeg;base64,')) {
        return false;
    }
    if (dataUrl.length > 2.5 * 1024 * 1024) return false;
    return true;
}

function getSofficeBinary() {
    const candidates = [
        '/usr/local/bin/soffice',
        '/usr/bin/soffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return p;
        } catch {
            // ignore
        }
    }
    return null;
}

function getUpfrontTier(studentCount) {
    const count = Number(studentCount) || 0;
    if (count < 500) {
        return {
            ratePercent: 1.0,
            percentNum: 100,
            shortLabel: '100%',
            fullLabel: '100% Upfront Commercial Amount',
            multiYearLabel: 'Year 1 Upfront Commercial Amount (100%)',
            rowTitle: 'Upfront Payment (100% Advance)',
            clausePaymentSchool: '100% upfront advance upon commencement of each academic year',
            clausePaymentIdCard: '100% advance before printing commencement',
            footer1Yr: '* Billed 100% upfront advance upon agreement execution. Taxes extra.',
            footerMultiYr: (yearly) => `* Billed annually with 100% advance (₹${yearly.toLocaleString('en-IN')}/year) per academic year. Taxes extra.`
        };
    } else if (count <= 1000) {
        return {
            ratePercent: 0.75,
            percentNum: 75,
            shortLabel: '75%',
            fullLabel: '75% Upfront Commercial Amount',
            multiYearLabel: 'Year 1 Upfront Commercial Amount (75%)',
            rowTitle: 'Upfront Payment (75% Advance)',
            clausePaymentSchool: '75% upfront upon commencement of each academic year, and the remaining 25% midway through the academic year',
            clausePaymentIdCard: '75% advance before printing commencement, and the remaining 25% upon delivery of cards',
            footer1Yr: '* Billed in two installments (75% upfront upon commencement + 25% mid-year). Taxes extra.',
            footerMultiYr: (yearly) => `* Billed annually at ₹${yearly.toLocaleString('en-IN')}/year in two installments (75% upfront + 25% mid-year) per academic year. Taxes extra.`
        };
    } else {
        return {
            ratePercent: 0.50,
            percentNum: 50,
            shortLabel: '50%',
            fullLabel: '50% Upfront Commercial Amount',
            multiYearLabel: 'Year 1 Upfront Commercial Amount (50%)',
            rowTitle: 'Upfront Payment (50% Advance)',
            clausePaymentSchool: '50% upfront upon commencement of each academic year, and the remaining 50% midway through the academic year',
            clausePaymentIdCard: '50% advance before printing commencement, and the remaining 50% upon delivery of cards',
            footer1Yr: '* Billed in two 50% installments (50% upfront upon commencement + 50% mid-year). Taxes extra.',
            footerMultiYr: (yearly) => `* Billed annually at ₹${yearly.toLocaleString('en-IN')}/year in two 50% installments per academic year. Taxes extra.`
        };
    }
}

function generateDocxBuffer(body) {
    const schoolName = sanitizeString(body.schoolName, 120, 'Institution');
    const city = sanitizeString(body.city, 80, '');
    const address = sanitizeString(body.address, 200, '');
    const udiseCode = sanitizeString(body.udiseCode, 40, '—');
    const principalName = sanitizeString(body.principalName, 100, 'Authorised Signatory');
    const designation = sanitizeString(body.designation, 80, 'Principal');
    const academicYear = sanitizeString(body.academicYear, 20, '2026–27');
    const refId = sanitizeString(body.refId, 60, `QP/MOU/2026-27/${Math.floor(1000 + Math.random() * 9000)}`);
    const date = sanitizeString(body.date, 40, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));
    const jurisdiction = sanitizeString(body.jurisdiction, 80, 'Dhule, Maharashtra');
    const durationWords = sanitizeString(body.durationWords, 50, 'one (1) academic year');

    const studentCount = Number(body.studentCount) || 0;
    const isCollege = Boolean(body.isCollege);
    const yr1Count = Number(body.yr1Count) || 0;
    const yr1Rate = Number(body.yr1Rate) || 59;
    const yr2Count = Number(body.yr2Count) || 0;
    const yr2Rate = Number(body.yr2Rate) || 30;

    const tier = getUpfrontTier(studentCount);

    const rawTotalPrice = sanitizeString(body.totalPrice, 50, '₹0.00');
    const totalPriceLabel = sanitizeString(body.totalPriceLabel, 100, '');
    const rawUpfrontPrice = sanitizeString(body.upfrontPrice, 50, '₹0.00');

    const duration = Number(body.duration) || (durationWords.includes('two') ? 2 : durationWords.includes('three') ? 3 : 1);
    const defaultUpfrontLabel = duration > 1 ? tier.multiYearLabel : tier.fullLabel;
    const upfrontPriceLabel = sanitizeString(body.upfrontPriceLabel, 100, defaultUpfrontLabel);
    const upfrontRowTitle = sanitizeString(body.upfrontRowTitle, 100, upfrontPriceLabel);

    // Server-side fail-safe calculation: if client sends ₹0.00, recalculate from strength & rate
    let calculatedTotal = 0;
    let calculatedYearly = 0;
    if (isCollege) {
        calculatedYearly = (yr1Count * yr1Rate) + (yr2Count * yr2Rate);
    } else {
        const rate = Number(body.rate) || 59;
        calculatedYearly = studentCount * rate;
    }
    calculatedTotal = calculatedYearly * duration;

    const defaultFooter = duration > 1
        ? tier.footerMultiYr(calculatedYearly)
        : tier.footer1Yr;
    const commFooter = sanitizeString(body.commFooter, 250, defaultFooter);

    const totalPrice = (rawTotalPrice === '₹0.00' || !rawTotalPrice || rawTotalPrice === '0') && calculatedTotal > 0
        ? '₹' + calculatedTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        : rawTotalPrice;
    const upfrontPrice = (rawUpfrontPrice === '₹0.00' || !rawUpfrontPrice || rawUpfrontPrice === '0') && calculatedYearly > 0
        ? '₹' + (calculatedYearly * tier.ratePercent).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        : rawUpfrontPrice;

    const isIdCardOnly = Boolean(body.isIdCardOnly);
    const mouSubtitle = isIdCardOnly
        ? 'For Provision of Student Smart ID Card Services'
        : 'For Implementation of Quantech Platform';
    const providerRoleDetail = isIdCardOnly
        ? 'Smart ID Card & Digital Solutions Provider'
        : 'Developers of Quantech Platform';

    const clause1Purpose = isIdCardOnly
        ? 'The purpose of this MOU is to set forth the terms under which the Provider shall design, manufacture, and supply Student Smart ID Cards & Branded Lanyards to the Institution. This agreement covers physical ID card provision and student identity services exclusively, and does not include ERP software platform access.'
        : 'The purpose of this MOU is to set forth the terms under which the Provider shall grant the School access to the Quantech Platform — a cloud-based software platform for managing academics, fees, attendance, hostel, transport, and administrative operations.';

    const clause2Intro = isIdCardOnly
        ? `The Institution hereby confirms its order for Student Smart ID Cards & Branded Lanyards for the following student strength for the academic year ${academicYear}:`
        : `The Institution hereby confirms its intent to onboard the following students onto the Quantech Platform for the academic year ${academicYear}:`;

    const clause2Sla = isIdCardOnly
        ? `ID card manufacturing, lanyard branding, and delivery schedules shall be calculated based on the above student strength. Any additional student ID cards required beyond ${studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—'} students during the agreement period shall be billed at the agreed rate of ₹45 per card.`
        : `Licensing, data storage allocation, and support SLAs shall be calculated based on the above enrollment strength. Any increase beyond ${studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—'} students during the agreement period shall be subject to a revised quote.`;

    const clause3Items = isIdCardOnly ? [
        { text: 'Design, print, and supply high-durability PVC Student Smart ID Cards with customized institution branding, photo, and barcode/QR code.' },
        { text: 'Supply matching customized branded lanyards and protective card holders for all enrolled students.' },
        { text: 'Ensure quality inspection, error-free printing, and durable thermal lamination prior to dispatch.' },
        { text: 'Deliver printed cards safely to the Institution premises within agreed delivery timelines upon receiving complete student data.' },
        { text: 'Provide digital student data/ID records to the Institution for institutional record-keeping.' }
    ] : [
        { text: 'Provide full access to the Quantech Platform modules as agreed, including Academics, Fee Management, Attendance, Reports, Hostel, and Transport (as applicable).' },
        { text: 'Ensure 99.5% platform uptime during school operational hours.' },
        { text: 'Provide onboarding support, staff training sessions (online), and technical documentation.' },
        { text: 'Maintain data confidentiality and comply with applicable data protection laws.' },
        { text: 'Deliver feature updates and security patches throughout the agreement period at no additional cost.' }
    ];

    const clause4Title = isIdCardOnly ? '4. Obligations of the Institution' : '4. Obligations of the School';
    const clause4Items = isIdCardOnly ? [
        { text: 'Appoint a designated Institution Coordinator responsible for ID card data collection and sample proof approval.' },
        { text: 'Provide accurate and complete student data (Name, Class/Roll No, Blood Group, Contact, Photo) in the required format.' },
        { text: 'Promptly review and approve digital sample proofs before bulk printing commencement.' },
        { text: `Ensure timely payment of ID card charges: ${tier.clausePaymentIdCard}.` },
        { text: 'Report any manufacturing defects or card discrepancies within 14 days of delivery for prompt replacement.' }
    ] : [
        { text: 'Appoint a designated Quantech Platform Coordinator responsible for internal rollout and communication.' },
        { text: 'Provide accurate and complete student data for onboarding within 14 days of agreement execution.' },
        { text: `Ensure timely payment of subscription fees, billed annually: ${tier.clausePaymentSchool} upon invoice issuance by the Provider.` },
        { text: 'Not share, sub-license, or resell access to the Quantech Platform to any third party.' },
        { text: 'Report technical issues through the designated support channel promptly.' }
    ];

    const templatePath = path.join(process.cwd(), 'templates', 'mou', 'quantech-mou.docx');
    if (!fs.existsSync(templatePath)) {
        throw new Error('Master Word template missing at templates/mou/quantech-mou.docx');
    }

    const templateBinary = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateBinary);

    const providerSignPath = path.join(process.cwd(), 'public', 'assets', 'sign.png');
    const providerSignBuf = fs.existsSync(providerSignPath) ? fs.readFileSync(providerSignPath) : Buffer.from('');

    const imageOptions = {
        centered: false,
        getImage: function (tagValue, tagName) {
            if (tagName === 'providerSignature') return providerSignBuf;
            if (tagName === 'schoolSignature') {
                if (isValidSignature(tagValue)) {
                    const base64 = tagValue.split(',')[1];
                    return Buffer.from(base64, 'base64');
                }
            }
            return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        },
        getSize: function () {
            return [160, 60];
        }
    };

    const doc = new Docxtemplater(zip, {
        modules: [new ImageModule(imageOptions)],
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => ''
    });

    doc.render({
        refId,
        date,
        academicYear,
        mouSubtitle,
        providerRoleDetail,
        schoolName,
        city,
        address,
        udiseCode,
        clause1Purpose,
        clause2Intro,
        studentCount: studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—',
        isCollege,
        yr1Count: yr1Count.toLocaleString('en-IN'),
        yr1Rate,
        yr2Count: yr2Count.toLocaleString('en-IN'),
        yr2Rate,
        totalPrice,
        totalPriceLabel,
        upfrontPrice,
        upfrontPriceLabel,
        upfrontRowTitle,
        commFooter,
        clause2Sla,
        clause3Items,
        clause4Title,
        clause4Items,
        durationWords,
        jurisdiction,
        principalName,
        designation,
        schoolSignature: body.signatureDataUrl || '',
        providerSignature: 'provider_sign'
    });

    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Secure headless conversion with isolated profile, no shell, and hard timeout
async function convertDocxToPdfSecure(docxBuffer) {
    const sofficeBinary = getSofficeBinary();
    if (!sofficeBinary) {
        throw new Error('LibreOffice binary (soffice) not found on host');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mou-conv-'));
    const inputDocxPath = path.join(tempDir, 'input.docx');
    const outputPdfPath = path.join(tempDir, 'input.pdf');
    const profileDir = path.join(tempDir, 'profile');

    fs.writeFileSync(inputDocxPath, docxBuffer, { mode: 0o600 });

    const args = [
        '--headless',
        '--invisible',
        '--nodefault',
        '--nofirststartwizard',
        '--nolockcheck',
        '--nologo',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to', 'pdf',
        '--outdir', tempDir,
        inputDocxPath
    ];

    try {
        await conversionLimit(() => execFileAsync(sofficeBinary, args, {
            timeout: 15000,
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
            shell: false
        }));

        if (!fs.existsSync(outputPdfPath)) {
            throw new Error('LibreOffice conversion completed but output PDF was not found');
        }

        return fs.readFileSync(outputPdfPath);
    } finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup errors
        }
    }
}

// Fallback HTML-to-PDF via Puppeteer if LibreOffice is unavailable or legacy HTML is provided
async function renderHtmlWithPuppeteer(html) {
    let browser = null;
    try {
        let processedHtml = html.replace(/src=["']\/assets\/([^"']+)["']/g, (match, assetName) => {
            try {
                const filePath = path.join(process.cwd(), 'public', 'assets', assetName);
                if (fs.existsSync(filePath)) {
                    const ext = path.extname(assetName).replace('.', '').toLowerCase();
                    const mime = ext === 'png' ? 'image/png' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
                    const b64 = fs.readFileSync(filePath).toString('base64');
                    return `src="data:${mime};base64,${b64}"`;
                }
            } catch { /* ignore */ }
            return match;
        });

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            try {
                const parsed = new URL(req.url());
                const proto = parsed.protocol.toLowerCase();
                const hostname = parsed.hostname.toLowerCase();
                if (proto === 'file:' || proto === 'about:' || proto === 'chrome:') return req.abort();
                const blocked = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
                if (blocked.includes(hostname) || hostname.endsWith('.internal') || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
                    return req.abort();
                }
                if (proto === 'http:' || proto === 'https:' || proto === 'data:') return req.continue();
                return req.abort();
            } catch {
                return req.abort();
            }
        });

        await page.emulateMediaType('print');
        await page.setContent(processedHtml, { waitUntil: 'networkidle0' });

        return await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '25.4mm', bottom: '25.4mm', left: '25.4mm', right: '25.4mm' }
        });
    } finally {
        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }
    }
}

export async function POST(req) {
    try {
        const body = await req.json();

        const schoolName = sanitizeString(body.schoolName, 120, '');
        const filename = sanitizeFilename(body.filename || `MOU_Quantech_${schoolName || 'School'}_2026-27.pdf`);

        // Mode A: Primary Secure Path — Convert from Master Word Template (.docx -> PDF)
        if (schoolName || body.principalName || body.refId) {
            try {
                const docxBuffer = generateDocxBuffer(body);
                const pdfBuffer = await convertDocxToPdfSecure(docxBuffer);

                return new Response(pdfBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                        'Cache-Control': 'no-cache'
                    }
                });
            } catch (docxErr) {
                console.warn('[MOU PDF] Word template conversion failed, attempting Puppeteer fallback if HTML provided:', docxErr.message);
                if (!body.html) {
                    throw docxErr;
                }
            }
        }

        // Mode B: Fallback or Legacy Path — HTML via Puppeteer
        if (body.html && typeof body.html === 'string') {
            const pdfBuffer = await renderHtmlWithPuppeteer(body.html);
            return new Response(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                    'Cache-Control': 'no-cache'
                }
            });
        }

        return NextResponse.json({ error: "Missing required MOU data or HTML content" }, { status: 400 });
    } catch (error) {
        console.error("MOU PDF generation fatal error:", error);
        return NextResponse.json({ error: "Failed to generate PDF: " + (error.message || "Unknown error") }, { status: 500 });
    }
}

// GET /api/v1/mou/pdf?id={submissionId} or ?refId={refId} (Admin direct download without re-entering)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const refId = searchParams.get('refId');

        if (!id && !refId) {
            return NextResponse.json({ error: "Missing submission id or refId" }, { status: 400 });
        }

        await connectDB();
        const submission = id 
            ? await MouSubmission.findById(id) 
            : await MouSubmission.findOne({ refId }).sort({ createdAt: -1 });

        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        const duration = Number(submission.mouDuration) || 1;
        const durationWordsMap = {
            1: 'one (1) academic year',
            2: 'two (2) academic years',
            3: 'three (3) academic years',
            4: 'four (4) academic years',
            5: 'five (5) academic years'
        };

        const isSDC = submission.coupon && ['SDC', 'SDC20', 'SDC-SPECIAL'].includes(submission.coupon.toUpperCase());
        const yr2Rate = isSDC ? 20 : 30;

        const dateStr = new Date(submission.createdAt || Date.now()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const safeRef = (submission.refId || 'MOU').replace(/[/\\:*?"<>|\r\n\t]/g, '_');
        const safeSchool = (submission.schoolName || 'Institute').replace(/[/\\:*?"<>|\r\n\t]/g, '_');
        const filename = `MOU_${safeRef}_${safeSchool}.pdf`;

        const payload = {
            schoolName: submission.schoolName,
            city: submission.city,
            address: submission.address,
            udiseCode: submission.udiseCode,
            principalName: submission.principalName,
            designation: submission.designation,
            academicYear: '2026–27',
            refId: submission.refId,
            studentCount: submission.studentCount,
            duration: duration,
            durationWords: durationWordsMap[duration] || `${duration} academic years`,
            rate: submission.perStudentRate || 59,
            isCollege: submission.instituteType !== 'school',
            yr1Count: submission.yearWiseCounts?.yr1 || 0,
            yr1Rate: 59,
            yr2Count: submission.yearWiseCounts?.yr2 || 0,
            yr2Rate: yr2Rate,
            totalPrice: '₹' + (submission.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            upfrontPrice: '₹' + (submission.upfrontPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            signatureDataUrl: submission.signatureDataUrl || '',
            date: dateStr,
            filename
        };

        const docxBuffer = generateDocxBuffer(payload);
        const pdfBuffer = await convertDocxToPdfSecure(docxBuffer);

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error("GET /api/v1/mou/pdf error:", error);
        return NextResponse.json({ error: "Failed to generate PDF: " + (error.message || "Unknown error") }, { status: 500 });
    }
}
