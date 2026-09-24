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
            clausePaymentSchool: '75% upfront upon commencement of each academic year, and the remaining 25% immediately after platform implementation',
            clausePaymentIdCard: '75% advance before printing commencement, and the remaining 25% upon delivery of cards',
            footer1Yr: '* Billed in two installments (75% upfront upon commencement + 25% immediately after implementation). Taxes extra.',
            footerMultiYr: (yearly) => `* Billed annually at ₹${yearly.toLocaleString('en-IN')}/year in two installments (75% upfront + 25% immediately after implementation) per academic year. Taxes extra.`
        };
    } else {
        return {
            ratePercent: 0.50,
            percentNum: 50,
            shortLabel: '50%',
            fullLabel: '50% Upfront Commercial Amount',
            multiYearLabel: 'Year 1 Upfront Commercial Amount (50%)',
            rowTitle: 'Upfront Payment (50% Advance)',
            clausePaymentSchool: '50% upfront upon commencement of each academic year, and the remaining 50% immediately after platform implementation',
            clausePaymentIdCard: '50% advance before printing commencement, and the remaining 50% upon delivery of cards',
            footer1Yr: '* Billed in two 50% installments (50% upfront upon commencement + 50% immediately after implementation). Taxes extra.',
            footerMultiYr: (yearly) => `* Billed annually at ₹${yearly.toLocaleString('en-IN')}/year in two 50% installments (50% upfront + 50% immediately after implementation) per academic year. Taxes extra.`
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

function generateMouHtml(data) {
    const schoolName = sanitizeString(data.schoolName, 120, 'Institution');
    const city = sanitizeString(data.city, 80, '');
    const address = sanitizeString(data.address, 200, '');
    const udiseCode = sanitizeString(data.udiseCode, 40, '—');
    const principalName = sanitizeString(data.principalName, 100, 'Authorised Signatory');
    const designation = sanitizeString(data.designation, 80, 'Principal');
    const refId = sanitizeString(data.refId, 60, 'QP/MOU/2026-27/—');
    const date = sanitizeString(data.date, 40, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));
    const studentCount = Number(data.studentCount) || 0;
    const isCollege = Boolean(data.isCollege);
    const yr1Count = Number(data.yr1Count) || 0;
    const yr1Rate = Number(data.yr1Rate) || 59;
    const yr2Count = Number(data.yr2Count) || 0;
    const yr2Rate = Number(data.yr2Rate) || 30;
    const yr3Count = Number(data.yr3Count) || 0;
    const isDegreeCollege = data.instituteType === 'college_degree';
    const duration = Number(data.duration) || 1;
    const durationWords = sanitizeString(data.durationWords, 50, duration === 1 ? 'one (1) academic year' : `${duration} academic years`);
    const isIdCardOnly = Boolean(data.isIdCardOnly);
    const totalPrice = sanitizeString(data.totalPrice, 50, '₹0.00');
    const upfrontPrice = sanitizeString(data.upfrontPrice, 50, '₹0.00');
    const tier = data.tier || getUpfrontTier(studentCount);
    const commFooter = sanitizeString(data.commFooter, 250, duration > 1 ? tier.footerMultiYr(studentCount * yr1Rate) : tier.footer1Yr);
    const signatureDataUrl = data.signatureDataUrl || '';

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
        ? 'The Institution hereby confirms its order for Student Smart ID Cards & Branded Lanyards for the following student strength for the academic year 2026–27:'
        : 'The Institution hereby confirms its intent to onboard the following students onto the Quantech Platform for the academic year 2026–27:';

    const clause2Sla = isIdCardOnly
        ? `ID card manufacturing, lanyard branding, and delivery schedules shall be calculated based on the above student strength. Any additional student ID cards required beyond ${studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—'} students during the agreement period shall be billed at the agreed rate of ₹45 per card.`
        : `Licensing, data storage allocation, and support SLAs shall be calculated based on the above enrollment strength. Any increase beyond ${studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—'} students during the agreement period shall be subject to a revised quote.`;

    let collegeBreakdownHtml = '';
    if (isCollege) {
        collegeBreakdownHtml = `
            <div style="margin-top:3px;font-size:8pt;color:#475569;line-height:1.35;">
                • 1st Year (New Cards): <strong>${yr1Count.toLocaleString('en-IN')}</strong> students @ ₹${yr1Rate}/student<br/>
                • 2nd Year (Renewals): <strong>${yr2Count.toLocaleString('en-IN')}</strong> students @ ₹${yr2Rate}/student
                ${isDegreeCollege && yr3Count > 0 ? `<br/>• 3rd Year (Renewals): <strong>${yr3Count.toLocaleString('en-IN')}</strong> students @ ₹${yr2Rate}/student` : ''}
            </div>
        `;
    }

    const schoolSigImgHtml = signatureDataUrl
        ? `<img src="${signatureDataUrl}" alt="Authorised Signature" />`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MOU - ${schoolName}</title>
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
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
    }
    .mou-page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      padding: 12mm 16mm 12mm 16mm;
      position: relative;
      background: #ffffff;
      page-break-after: always;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .mou-page:last-child {
      page-break-after: avoid;
    }
    .mou-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748b;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mou-content {
      flex: 1;
    }
    .mou-letterhead-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1.5pt solid #1e3a8a;
      margin-bottom: 10px;
    }
    .mou-letterhead-table td {
      vertical-align: middle;
      padding-bottom: 8px;
    }
    .lh-logo-cell img {
      max-height: 44px;
      width: auto;
      object-fit: contain;
    }
    .lh-corp-cell {
      text-align: right;
    }
    .lh-corp-cell h2 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0 0 2px 0;
      letter-spacing: 0.02em;
    }
    .lh-corp-cell p {
      font-size: 8pt;
      color: #475569;
      line-height: 1.3;
      margin: 0;
    }
    .mou-doc-title {
      text-align: center;
      margin: 6px 0 2px 0;
    }
    .mou-doc-title h1 {
      font-size: 14pt;
      font-weight: 700;
      color: #1e3a8a;
      letter-spacing: 0.03em;
      margin: 0 0 2px 0;
    }
    .mou-doc-title .doc-subtitle {
      font-size: 9.5pt;
      font-style: italic;
      color: #475569;
    }
    .doc-ref-date-row {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
      margin: 6px 0 10px 0;
    }
    .doc-ref-date-row strong {
      color: #0f172a;
    }
    .mou-parties-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1.5pt solid #0f172a;
      border-bottom: 1.5pt solid #0f172a;
      margin-bottom: 12px;
    }
    .mou-parties-table td {
      width: 50%;
      padding: 8px 12px;
      vertical-align: top;
      border-right: 1px solid #e2e8f0;
    }
    .mou-parties-table td:last-child {
      border-right: none;
    }
    .party-cell-title {
      font-size: 8pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 3px;
    }
    .party-cell-name {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .party-cell-detail {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
    }
    .mou-section {
      margin-bottom: 10px;
    }
    .mou-section h3 {
      font-size: 10pt;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0 0 4px 0;
    }
    .mou-section p {
      font-size: 9pt;
      line-height: 1.45;
      color: #1e293b;
      margin: 0 0 4px 0;
      text-align: justify;
    }
    .mou-section ul {
      padding-left: 18px;
      margin: 0 0 4px 0;
    }
    .mou-section ul li {
      font-size: 8.8pt;
      line-height: 1.4;
      color: #1e293b;
      margin-bottom: 3px;
    }
    .mou-commercial-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1.5pt solid #0f172a;
      border-bottom: 1.5pt solid #0f172a;
      margin: 6px 0 8px 0;
    }
    .mou-commercial-table td {
      padding: 5px 8px;
      font-size: 8.8pt;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .mou-commercial-table td.comm-td-label {
      width: 40%;
      background: #fafafa;
      font-weight: 600;
      color: #1e293b;
    }
    .mou-commercial-table td.comm-td-val {
      width: 60%;
      color: #0f172a;
    }
    .comm-val-strong {
      font-weight: 700;
      color: #1e3a8a;
      font-size: 9.5pt;
    }
    .comm-val-upfront {
      font-weight: 700;
      color: #059669;
      font-size: 9.5pt;
    }
    .mou-page-sig-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
    }
    .sig-footer-col {
      width: 46%;
    }
    .sig-footer-col.sig-footer-right {
      text-align: right;
    }
    .sig-footer-img-wrap {
      height: 32px;
      display: flex;
      align-items: flex-end;
    }
    .sig-footer-col.sig-footer-right .sig-footer-img-wrap {
      justify-content: flex-end;
    }
    .sig-footer-img-wrap img {
      max-height: 30px;
      max-width: 130px;
      object-fit: contain;
    }
    .sig-footer-line {
      border-bottom: 1px solid #0f172a;
      margin: 2px 0 3px 0;
    }
    .sig-footer-text {
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.25;
    }
    .mou-signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .mou-signatures-table td {
      width: 50%;
      vertical-align: top;
      padding: 0 14px 0 0;
    }
    .mou-signatures-table td:last-child {
      padding: 0 0 0 14px;
    }
    .sig-party-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 4px;
    }
    .sig-direct-wrap {
      height: 52px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      margin-bottom: 2px;
    }
    .sig-direct-img {
      max-height: 48px;
      max-width: 180px;
      object-fit: contain;
    }
    .sig-direct-placeholder {
      height: 40px;
    }
    .sig-line-rule {
      border-bottom: 1.5pt solid #0f172a;
      height: 1px;
      margin: 2px 0 5px 0;
    }
    .sig-meta-text p {
      font-size: 8.5pt;
      line-height: 1.3;
      color: #334155;
      margin: 0 0 2px 0;
    }
    .mou-doc-footer-note {
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
      margin-top: 10px;
    }
  </style>
</head>
<body>

  <!-- Page 1 -->
  <div class="mou-page">
    <div class="mou-running-header">
      <span>Official Memorandum of Understanding</span>
      <span>MOU Agreement with <strong>${schoolName}</strong></span>
    </div>
    
    <div class="mou-content">
      <table class="mou-letterhead-table">
        <tr>
          <td class="lh-logo-cell">
            <img src="/quantech/Quantech-Logo.png" alt="Quantech Infosystem Logo" />
          </td>
          <td class="lh-corp-cell">
            <h2>QUANTECH INFOSYSTEM LLP.</h2>
            <p>3rd Floor, Behind Gurudwara, Mumbai-Agra Highway, Dhule, Maharashtra – 424001</p>
            <p>Email: admin@quantechinfosystem.com | Web: https://quantechinfosystem.com</p>
          </td>
        </tr>
      </table>

      <div class="mou-doc-title">
        <h1>MEMORANDUM OF UNDERSTANDING</h1>
        <div class="doc-subtitle">${mouSubtitle}</div>
      </div>

      <div class="doc-ref-date-row">
        Ref No: <strong>${refId}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Date: <strong>${date}</strong>
      </div>

      <table class="mou-parties-table">
        <tr>
          <td>
            <div class="party-cell-title">PARTY A — SERVICE PROVIDER</div>
            <div class="party-cell-name">Quantech Infosystem LLP.</div>
            <div class="party-cell-detail">${providerRoleDetail}<br/>India</div>
          </td>
          <td>
            <div class="party-cell-title">PARTY B — INSTITUTION</div>
            <div class="party-cell-name">${schoolName}</div>
            <div class="party-cell-detail">
              <span>${city}${address ? (city ? ', ' : '') + address : ''}</span>
              <div style="margin-top:3px;">UDISE Code: <strong style="color:#1e3a8a;">${udiseCode}</strong></div>
            </div>
          </td>
        </tr>
      </table>

      <div class="mou-section">
        <h3>1. Background &amp; Purpose</h3>
        <p>This Memorandum of Understanding ("MOU") is entered into between <strong>Quantech Infosystem LLP.</strong> (hereinafter "the Provider") and <strong>${schoolName}</strong> (hereinafter "the Institution"), collectively referred to as "the Parties."</p>
        <p>${clause1Purpose}</p>
      </div>

      <div class="mou-section">
        <h3>2. Scope of Enrollment</h3>
        <p>${clause2Intro}</p>

        <table class="mou-commercial-table">
          <tr>
            <td class="comm-td-label">Agreed Student Enrollment Strength</td>
            <td class="comm-td-val">
              <span class="comm-val-strong">${studentCount > 0 ? studentCount.toLocaleString('en-IN') : '—'} Students</span>
              ${collegeBreakdownHtml}
              <div style="font-size:8pt;color:#64748b;margin-top:2px;">${schoolName}</div>
            </td>
          </tr>
          <tr>
            <td class="comm-td-label">${data.totalPriceLabel || 'Total Commercial Amount'}</td>
            <td class="comm-td-val">
              <span class="comm-val-strong">${totalPrice}</span>
            </td>
          </tr>
          <tr>
            <td class="comm-td-label">${data.upfrontPriceLabel || 'Upfront Commercial Amount'}</td>
            <td class="comm-td-val">
              <span class="comm-val-upfront">${upfrontPrice}</span>
            </td>
          </tr>
          <tr>
            <td class="comm-td-label">Billing Schedule &amp; Terms</td>
            <td class="comm-td-val" style="font-size:8.5pt;">
              ${commFooter}
            </td>
          </tr>
        </table>

        <p>${clause2Sla}</p>
      </div>
    </div>

    <!-- Page 1 Signature Footer -->
    <div class="mou-page-sig-footer">
      <div class="sig-footer-col">
        <div class="sig-footer-img-wrap">
          ${schoolSigImgHtml}
        </div>
        <div class="sig-footer-line"></div>
        <div class="sig-footer-text">
          <span><strong>${principalName}</strong> (${designation})</span><br/>
          <span>For ${schoolName}</span>
        </div>
      </div>
      <div class="sig-footer-col sig-footer-right">
        <div class="sig-footer-img-wrap">
          <img src="/assets/sign.png" alt="Quantech Signatory" />
        </div>
        <div class="sig-footer-line"></div>
        <div class="sig-footer-text">
          <span><strong>Authorised Representative</strong></span><br/>
          <span>For Quantech Infosystem LLP.</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Page 2 -->
  <div class="mou-page">
    <div class="mou-running-header">
      <span>Official Memorandum of Understanding</span>
      <span>MOU Agreement with <strong>${schoolName}</strong></span>
    </div>

    <div class="mou-content">
      <div class="mou-section">
        <h3>3. Obligations of the Provider</h3>
        <ul>
          <li>Provide full access to the Quantech Platform modules as agreed, including Academics, Fee Management, Attendance, Reports, Hostel, and Transport (as applicable).</li>
          <li>Ensure 99.5% platform uptime during school operational hours.</li>
          <li>Provide onboarding support, staff training sessions (online), and technical documentation.</li>
          <li>Maintain data confidentiality and comply with applicable data protection laws.</li>
          <li>Deliver feature updates and security patches throughout the agreement period at no additional cost.</li>
        </ul>
      </div>

      <div class="mou-section">
        <h3>4. Obligations of the Institution</h3>
        <ul>
          <li>Appoint a designated Quantech Platform Coordinator responsible for internal rollout and communication.</li>
          <li>Provide accurate and complete student data for onboarding within 14 days of agreement execution.</li>
          <li>Ensure timely payment of subscription fees: <strong>${tier.clausePaymentSchool || 'upfront advance upon commencement'}</strong> upon invoice issuance by the Provider.</li>
          <li>Not share, sub-license, or resell access to the Quantech Platform to any third party.</li>
          <li>Report technical issues through the designated support channel promptly.</li>
        </ul>
      </div>

      <div class="mou-section">
        <h3>5. Confidentiality</h3>
        <p>Both Parties agree to maintain strict confidentiality of all information exchanged under this MOU, including student data, pricing, and platform configurations. Student data shall be used solely for the purpose of providing the agreed services and shall not be shared with any third party without prior written consent.</p>
      </div>
    </div>

    <!-- Page 2 Signature Footer -->
    <div class="mou-page-sig-footer">
      <div class="sig-footer-col">
        <div class="sig-footer-img-wrap">
          ${schoolSigImgHtml}
        </div>
        <div class="sig-footer-line"></div>
        <div class="sig-footer-text">
          <span><strong>${principalName}</strong> (${designation})</span><br/>
          <span>For ${schoolName}</span>
        </div>
      </div>
      <div class="sig-footer-col sig-footer-right">
        <div class="sig-footer-img-wrap">
          <img src="/assets/sign.png" alt="Quantech Signatory" />
        </div>
        <div class="sig-footer-line"></div>
        <div class="sig-footer-text">
          <span><strong>Authorised Representative</strong></span><br/>
          <span>For Quantech Infosystem LLP.</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Page 3 -->
  <div class="mou-page">
    <div class="mou-running-header">
      <span>Official Memorandum of Understanding</span>
      <span>MOU Agreement with <strong>${schoolName}</strong></span>
    </div>

    <div class="mou-content">
      <div class="mou-section">
        <h3>6. Duration &amp; Termination</h3>
        <p>This MOU shall be effective from the date of signing and shall remain valid for a period of <strong>${durationWords}</strong>, renewable by mutual written consent. Either Party may terminate this MOU with <strong>30 days' written notice</strong>. Upon termination, the School's data shall be made available for export for a period of 30 days before deletion.</p>
      </div>

      <div class="mou-section">
        <h3>7. Limitation of Liability</h3>
        <p>The Provider's total liability under this MOU shall not exceed the total fees paid by the School in the preceding 3 months. The Provider shall not be liable for indirect, incidental, or consequential damages arising from the use or inability to use the platform.</p>
      </div>

      <div class="mou-section">
        <h3>8. Governing Law</h3>
        <p>This MOU shall be governed by the laws of India. Any disputes arising out of or in connection with this MOU shall be subject to the exclusive jurisdiction of the courts in <strong>Dhule, Maharashtra</strong>.</p>
      </div>

      <div class="mou-section">
        <h3>9. Entire Agreement</h3>
        <p>This MOU constitutes the entire understanding between the Parties with respect to its subject matter and supersedes all prior discussions, representations, or agreements. Amendments to this MOU shall be valid only if made in writing and signed by both Parties.</p>
      </div>

      <table class="mou-signatures-table">
        <tr>
          <td>
            <div class="sig-party-title">For and on behalf of Institution (Party B):</div>
            <div class="sig-direct-wrap">
              ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Authorised Signature" class="sig-direct-img" />` : `<div class="sig-direct-placeholder"></div>`}
            </div>
            <div class="sig-line-rule"></div>
            <div class="sig-meta-text">
              <p><strong>${principalName}</strong></p>
              <p>${designation}</p>
              <p>${schoolName}</p>
              <p>UDISE Code: ${udiseCode}</p>
              <p style="color:#64748b;margin-top:2px;">Date: ${date}</p>
            </div>
          </td>
          <td>
            <div class="sig-party-title">For and on behalf of Provider (Party A):</div>
            <div class="sig-direct-wrap">
              <img src="/assets/sign.png" alt="Quantech Authorised Signatory" class="sig-direct-img" />
            </div>
            <div class="sig-line-rule"></div>
            <div class="sig-meta-text">
              <p><strong>Authorised Representative</strong></p>
              <p>Director / CEO</p>
              <p>Quantech Infosystem LLP.</p>
              <p style="color:#94a3b8;font-size:8pt;">For office use only</p>
              <p style="color:#64748b;margin-top:2px;">Date: ${date}</p>
            </div>
          </td>
        </tr>
      </table>

      <div class="mou-doc-footer-note">
        This document was digitally generated &amp; executed via Quantech Platform MOU Portal &nbsp;|&nbsp; Ref No: ${refId}
      </div>
    </div>
  </div>

</body>
</html>`;
}

// Resilient HTML-to-PDF via Puppeteer (works on any host with or without LibreOffice)
async function renderHtmlWithPuppeteer(html) {
    let browser = null;
    try {
        let processedHtml = html.replace(/src=["']\/(assets|quantech)\/([^"']+)["']/g, (match, folder, assetName) => {
            try {
                const filePath = path.join(process.cwd(), 'public', folder, assetName);
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
        await page.setContent(processedHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

        return await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
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

        // Mode A: Try Word template if LibreOffice is available on host
        const sofficeBinary = getSofficeBinary();
        if (sofficeBinary && (schoolName || body.principalName || body.refId)) {
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
                console.warn('[MOU PDF POST] Word template conversion failed, falling back to Puppeteer HTML:', docxErr.message);
            }
        }

        // Mode B: Clean, consistent Puppeteer HTML renderer
        const html = generateMouHtml(body);
        const pdfBuffer = await renderHtmlWithPuppeteer(html);
        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Cache-Control': 'no-cache'
            }
        });
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

        const duration = Math.max(1, Number(submission.mouDuration) || 1);
        const durationWordsMap = {
            1: 'one (1) academic year',
            2: 'two (2) academic years',
            3: 'three (3) academic years',
            4: 'four (4) academic years',
            5: 'five (5) academic years'
        };

        const couponUpper = (submission.coupon || '').trim().toUpperCase();
        const isSDC = ['SDC', 'SDC20', 'SDC-SPECIAL'].includes(couponUpper);
        const isIdCardOnly = ['ID45', 'IDCARD45', 'CARD45', 'ID-45', 'IDONLY45'].includes(couponUpper);

        // Accurate institute type check (handles legacy entries where instituteType was undefined/null)
        const isCollege = submission.instituteType === 'college_degree' || submission.instituteType === 'college_pu';
        const isDegreeCollege = submission.instituteType === 'college_degree';

        const studentCount = Math.max(0, Number(submission.studentCount) || 0);
        const tier = getUpfrontTier(studentCount);

        const yr1Count = Number(submission.yearWiseCounts?.yr1) || (isCollege ? 0 : studentCount);
        const yr2Count = Number(submission.yearWiseCounts?.yr2) || 0;
        const yr3Count = Number(submission.yearWiseCounts?.yr3) || 0;

        const baseRate = Number(submission.perStudentRate) || (isIdCardOnly ? 45 : 59);
        const yr1Rate = isIdCardOnly ? 45 : baseRate;
        const yr2Rate = (isSDC || isIdCardOnly) ? 20 : 30;

        // Ensure proper calculated totals
        let calculatedYearly = 0;
        if (isCollege) {
            calculatedYearly = (yr1Count * yr1Rate) + (yr2Count * yr2Rate) + (isDegreeCollege ? yr3Count * yr2Rate : 0);
            if (calculatedYearly === 0 && studentCount > 0) {
                calculatedYearly = studentCount * baseRate;
            }
        } else {
            calculatedYearly = studentCount * baseRate;
        }
        const calculatedTotal = calculatedYearly * duration;

        const finalTotal = submission.totalPrice > 0 ? submission.totalPrice : calculatedTotal;
        const finalUpfront = submission.upfrontPrice > 0 ? submission.upfrontPrice : Math.round(calculatedYearly * tier.ratePercent);

        const totalPriceFormatted = '₹' + finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const upfrontPriceFormatted = '₹' + finalUpfront.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const dateStr = new Date(submission.createdAt || Date.now()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const safeRef = (submission.refId || 'MOU').replace(/[/\\:*?"<>|\r\n\t]/g, '_');
        const safeSchool = (submission.schoolName || 'Institute').replace(/[/\\:*?"<>|\r\n\t]/g, '_');
        const filename = `MOU_${safeRef}_${safeSchool}.pdf`;

        const defaultFooter = duration > 1
            ? tier.footerMultiYr(calculatedYearly)
            : tier.footer1Yr;

        const payload = {
            schoolName: submission.schoolName || 'Institution',
            city: submission.city || '',
            address: submission.address || '',
            udiseCode: submission.udiseCode || '—',
            principalName: submission.principalName || 'Authorised Signatory',
            designation: submission.designation || 'Principal',
            academicYear: '2026–27',
            refId: submission.refId || safeRef,
            studentCount,
            duration,
            durationWords: durationWordsMap[duration] || `${duration} academic years`,
            rate: baseRate,
            instituteType: submission.instituteType || 'school',
            isCollege,
            isIdCardOnly,
            yr1Count,
            yr1Rate,
            yr2Count,
            yr2Rate,
            yr3Count,
            tier,
            totalPrice: totalPriceFormatted,
            totalPriceLabel: duration > 1 ? `Total Commercial Amount (${duration} Years)` : 'Total Commercial Amount',
            upfrontPrice: upfrontPriceFormatted,
            upfrontPriceLabel: duration > 1 ? tier.multiYearLabel : tier.fullLabel,
            upfrontRowTitle: duration > 1 ? tier.multiYearLabel : tier.rowTitle,
            commFooter: defaultFooter,
            signatureDataUrl: submission.signatureDataUrl || '',
            date: dateStr,
            filename
        };

        let pdfBuffer = null;
        const sofficeBinary = getSofficeBinary();

        // Primary attempt: LibreOffice headless conversion if installed
        if (sofficeBinary) {
            try {
                const docxBuffer = generateDocxBuffer(payload);
                pdfBuffer = await convertDocxToPdfSecure(docxBuffer);
            } catch (docxErr) {
                console.warn('[MOU PDF GET] Word template conversion failed, falling back to Puppeteer HTML:', docxErr.message);
            }
        }

        // Secondary fallback: High-fidelity HTML to PDF via Puppeteer
        if (!pdfBuffer) {
            const html = generateMouHtml(payload);
            pdfBuffer = await renderHtmlWithPuppeteer(html);
        }

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
