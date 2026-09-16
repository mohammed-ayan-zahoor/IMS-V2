import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import mongoose from "mongoose";
import puppeteer from "puppeteer";

function numberToWordsINR(num) {
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    }

    if (!num || num === 0) return 'Zero Rupees Only';
    let n = Math.floor(num);
    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    const rest = n % 100;

    if (crore > 0) str += inWords(crore) + ' Crore ';
    if (lakh > 0) str += inWords(lakh) + ' Lakh ';
    if (thousand > 0) str += inWords(thousand) + ' Thousand ';
    if (hundred > 0) str += inWords(hundred) + ' Hundred ';
    if (rest > 0) str += (str ? 'and ' : '') + inWords(rest) + ' ';

    return (str.trim() + ' Rupees Only');
}

function generateExecutiveReceiptHtml(fee, logoBase64 = null) {
    const studentProfile = fee.student?.profile || {};
    const studentName = (studentProfile.firstName || studentProfile.lastName) 
        ? `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim()
        : (fee.student?.displayName || fee.student?.name || 'Mohammed Arman Shaikh');
    const studentEmail = fee.student?.email || 'arman.aqs@ims.com';
    const studentPhone = studentProfile.phone || '7845125674';
    const regNo = fee.student?.enrollmentNumber || 'STU20260005';
    
    const instituteName = fee.institute?.name || 'AQS Institute of Learning';
    const instituteLogo = logoBase64 || fee.institute?.branding?.logo || fee.institute?.logo;
    const addressObj = fee.institute?.address || {};
    const instituteAddress = addressObj.street
        ? `${addressObj.street}, ${addressObj.city || ''} ${addressObj.state || ''} ${addressObj.pincode || ''}`.trim()
        : 'Campus Boulevard, Knowledge Park, Dhule, Maharashtra';
    const contactEmail = fee.institute?.contactEmail || 'accounts@aqs-institute.edu';
    const contactPhone = fee.institute?.contactPhone || '+91 98765 43210';
    
    const batchName = fee.batch?.name || 'Batch 01';
    const courseName = fee.batch?.course?.name || 'Diploma in Computer Applications';
    const courseCode = fee.batch?.course?.code || 'DCA';
    const receiptNo = `REC-${fee._id.toString().slice(-8).toUpperCase()}`;

    const d = new Date(fee.createdAt || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth();
    const sessionStr = month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
    const issueDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');
    const finalAmount = (fee.totalAmount || 0) - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
    const balanceAmount = Math.max(0, finalAmount - (fee.paidAmount || 0));
    const amountInWords = numberToWordsINR(fee.paidAmount || 0);

    const tableRows = paidInstallments.map((inst, idx) => {
        const paidDateStr = inst.paidDate 
            ? new Date(inst.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : issueDateStr;
        const methodStr = (inst.paymentMethod || 'Cash').replace('_', ' ').toUpperCase();
        const txRef = inst.transactionId || 'OFFLINE-COUNTER';

        return `
            <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11px; text-align: center; color: #64748B;">
                    0${idx + 1}
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11px; color: #0F172A; font-weight: 600;">
                    ${inst.notes || `Academic Course Tuition Fee — Installment #${idx + 1}`}
                    <div style="font-size: 10px; color: #64748B; font-weight: normal; margin-top: 2px;">
                        Course: ${courseName} (${courseCode}) • ${batchName}
                    </div>
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11px; color: #334155; font-family: monospace;">
                    ${methodStr}
                    <div style="font-size: 9px; color: #64748B;">Txn: ${txRef}</div>
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11px; color: #334155; text-align: center;">
                    ${paidDateStr}
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 10px; text-align: center;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; background: #ECFDF5; color: #059669; font-weight: 700; border: 1px solid #A7F3D0;">
                        PAID
                    </span>
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; color: #0F172A; font-weight: 700;">
                    ₹${inst.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
            </tr>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${receiptNo} - Official Fee Receipt</title>
        <style>
            @page {
                size: A4;
                margin: 0;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: #FFFFFF;
                color: #0F172A;
                padding: 42px 48px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                line-height: 1.4;
            }
            .document-container {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
            }
            
            /* Top Institutional Header */
            .header-table {
                width: 100%;
                border-bottom: 2px solid #0F172A;
                padding-bottom: 20px;
                margin-bottom: 24px;
            }
            .inst-logo-img {
                max-height: 56px;
                max-width: 140px;
                object-fit: contain;
                display: block;
            }
            .inst-name {
                font-size: 22px;
                font-weight: 800;
                color: #0F172A;
                letter-spacing: -0.3px;
                text-transform: uppercase;
            }
            .inst-address {
                font-size: 10.5px;
                color: #475569;
                margin-top: 3px;
            }
            .inst-contact {
                font-size: 10px;
                color: #64748B;
                margin-top: 2px;
            }
            .receipt-heading-box {
                text-align: right;
            }
            .receipt-main-title {
                font-size: 18px;
                font-weight: 900;
                color: #0F172A;
                letter-spacing: 1.5px;
                text-transform: uppercase;
            }
            .receipt-badge-orig {
                display: inline-block;
                background: #F1F5F9;
                border: 1px solid #CBD5E1;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 700;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 4px;
            }
            .receipt-meta-grid {
                margin-top: 8px;
                font-size: 11px;
                color: #334155;
            }
            .receipt-meta-grid span {
                font-weight: 700;
                color: #0F172A;
            }

            /* Meta Information Grid */
            .info-panels {
                display: table;
                width: 100%;
                margin-bottom: 24px;
            }
            .info-panel-col {
                display: table-cell;
                width: 50%;
                vertical-align: top;
            }
            .info-panel-col:first-child {
                padding-right: 16px;
            }
            .info-panel-col:last-child {
                padding-left: 16px;
            }
            .panel-inner {
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                padding: 14px 16px;
                height: 100%;
            }
            .panel-title {
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                color: #64748B;
                border-bottom: 1px solid #E2E8F0;
                padding-bottom: 6px;
                margin-bottom: 10px;
            }
            .panel-row {
                font-size: 11px;
                margin-bottom: 4px;
                display: flex;
                justify-content: space-between;
            }
            .panel-row .label {
                color: #64748B;
            }
            .panel-row .val {
                font-weight: 700;
                color: #0F172A;
                text-align: right;
            }
            .student-lead-name {
                font-size: 13px;
                font-weight: 800;
                color: #0F172A;
                margin-bottom: 4px;
            }

            /* Ledger Table */
            .ledger-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .ledger-table th {
                background: #F1F5F9;
                border-top: 1px solid #0F172A;
                border-bottom: 2px solid #0F172A;
                padding: 10px 12px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #0F172A;
            }
            .ledger-table td {
                vertical-align: middle;
            }

            /* Bottom Summary & Words */
            .bottom-container {
                display: table;
                width: 100%;
                margin-top: 12px;
            }
            .bottom-left-col {
                display: table-cell;
                width: 58%;
                vertical-align: top;
                padding-right: 24px;
            }
            .bottom-right-col {
                display: table-cell;
                width: 42%;
                vertical-align: top;
            }
            .amount-words-box {
                background: #F8FAFC;
                border-left: 3px solid #0F172A;
                padding: 10px 14px;
                border-radius: 0 6px 6px 0;
                margin-bottom: 16px;
            }
            .amount-words-label {
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #64748B;
            }
            .amount-words-val {
                font-size: 11.5px;
                font-weight: 700;
                color: #0F172A;
                font-style: italic;
                margin-top: 2px;
            }
            .terms-box {
                font-size: 9.5px;
                color: #64748B;
                line-height: 1.5;
            }
            .terms-title {
                font-size: 9.5px;
                font-weight: 800;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }

            /* Totals Breakdown */
            .totals-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #E2E8F0;
                border-radius: 6px;
                overflow: hidden;
            }
            .totals-table td {
                padding: 8px 12px;
                font-size: 11px;
                border-bottom: 1px solid #E2E8F0;
            }
            .totals-table tr:last-child td {
                border-bottom: none;
            }
            .totals-table .t-label {
                color: #475569;
            }
            .totals-table .t-val {
                text-align: right;
                font-weight: 700;
                color: #0F172A;
            }
            .totals-table tr.highlight-paid {
                background: #ECFDF5;
            }
            .totals-table tr.highlight-paid .t-label {
                font-weight: 800;
                color: #065F46;
            }
            .totals-table tr.highlight-paid .t-val {
                font-size: 13px;
                font-weight: 900;
                color: #065F46;
            }
            .totals-table tr.highlight-due {
                background: #FFFBEB;
            }
            .totals-table tr.highlight-due .t-label {
                font-weight: 700;
                color: #92400E;
            }
            .totals-table tr.highlight-due .t-val {
                font-weight: 800;
                color: #92400E;
            }

            /* Security Footer */
            .footer-security-note {
                margin-top: 32px;
                padding-top: 14px;
                border-top: 1px solid #E2E8F0;
                font-size: 8.5px;
                color: #94A3B8;
                text-align: center;
                letter-spacing: 0.3px;
            }
        </style>
    </head>
    <body>
        <div class="document-container">
            <!-- Institutional Header -->
            <table class="header-table" cellpadding="0" cellspacing="0">
                <tr>
                    ${instituteLogo ? `
                    <td style="vertical-align: middle; width: 140px; padding-right: 18px;">
                        <img src="${instituteLogo}" alt="${instituteName}" style="max-height: 56px; max-width: 140px; object-fit: contain; display: block;" />
                    </td>
                    ` : ''}
                    <td style="vertical-align: middle;">
                        <div class="inst-name">${instituteName}</div>
                        <div class="inst-address">${instituteAddress}</div>
                        <div class="inst-contact">Email: ${contactEmail} • Phone: ${contactPhone}</div>
                    </td>
                    <td class="receipt-heading-box" style="vertical-align: middle;">
                        <div class="receipt-main-title">FEE RECEIPT</div>
                        <div class="receipt-badge-orig">Original For Student</div>
                        <div class="receipt-meta-grid">
                            Receipt No: <span>${receiptNo}</span><br>
                            Date of Issue: <span>${issueDateStr}</span><br>
                            Session: <span>${sessionStr}</span>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Billed To / Student & Academic Details Panels -->
            <div class="info-panels">
                <div class="info-panel-col">
                    <div class="panel-inner">
                        <div class="panel-title">STUDENT INFORMATION</div>
                        <div class="student-lead-name">${studentName}</div>
                        <div class="panel-row">
                            <span class="label">Student Enrollment ID:</span>
                            <span class="val">${regNo}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Email Address:</span>
                            <span class="val">${studentEmail}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Contact Number:</span>
                            <span class="val">${studentPhone}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Admission Category:</span>
                            <span class="val">Regular (General)</span>
                        </div>
                    </div>
                </div>
                <div class="info-panel-col">
                    <div class="panel-inner">
                        <div class="panel-title">PROGRAM & BATCH DETAILS</div>
                        <div class="student-lead-name">${courseName}</div>
                        <div class="panel-row">
                            <span class="label">Course Code:</span>
                            <span class="val">${courseCode}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Assigned Batch:</span>
                            <span class="val">${batchName}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Academic Session:</span>
                            <span class="val">${sessionStr}</span>
                        </div>
                        <div class="panel-row">
                            <span class="label">Payment Status:</span>
                            <span class="val" style="color: ${balanceAmount === 0 ? '#059669' : '#D97706'};">
                                ${balanceAmount === 0 ? 'Full Clearance' : 'Partially Cleared'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ledger Table -->
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th style="text-align: left;">Particulars / Fee Component</th>
                        <th style="width: 140px; text-align: left;">Payment Mode & Ref</th>
                        <th style="width: 90px; text-align: center;">Date</th>
                        <th style="width: 70px; text-align: center;">Status</th>
                        <th style="width: 110px; text-align: right;">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || `
                        <tr>
                            <td colspan="6" style="padding: 24px; text-align: center; color: #94A3B8; font-size: 11px;">
                                No cleared payment transactions found for this schedule.
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>

            <!-- Bottom Section: Terms & Totals -->
            <div class="bottom-container">
                <div class="bottom-left-col">
                    <div class="amount-words-box">
                        <div class="amount-words-label">Amount Cleared in Words:</div>
                        <div class="amount-words-val">${amountInWords}</div>
                    </div>

                    <div class="terms-box">
                        <div class="terms-title">Terms & Official Acknowledgments:</div>
                        <ol style="padding-left: 16px;">
                            <li>This document serves as an authentic institutional tax receipt for tuition fees paid.</li>
                            <li>All payments are non-refundable and non-transferable under academic bylaws.</li>
                            <li>Please preserve this physical / digital receipt for examination hall ticket issuance and course clearance.</li>
                        </ol>
                    </div>
                </div>

                <div class="bottom-right-col">
                    <table class="totals-table">
                        <tr>
                            <td class="t-label">Approved Course Tuition:</td>
                            <td class="t-val">₹${(fee.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        ${fee.discount?.amount > 0 ? `
                        <tr>
                            <td class="t-label" style="color: #DC2626;">Less: Institutional Concession:</td>
                            <td class="t-val" style="color: #DC2626;">- ₹${fee.discount.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>` : ''}
                        <tr>
                            <td class="t-label" style="font-weight: 700;">Net Payable Schedule:</td>
                            <td class="t-val" style="font-weight: 800;">₹${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr class="highlight-paid">
                            <td class="t-label">Total Amount Cleared:</td>
                            <td class="t-val">₹${(fee.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr class="highlight-due">
                            <td class="t-label">Balance Outstanding Due:</td>
                            <td class="t-val">₹${balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- System-Generated Verification Note -->
            <div class="footer-security-note" style="margin-top: 42px; text-align: center;">
                <div style="font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 4px;">
                    This is an authentic computer-generated receipt issued from the Student Portal. Since the transaction is recorded and verified in the system, no physical signature is required.
                </div>
                <div style="font-size: 8.5px; color: #94A3B8;">
                    Official secure document issued by ${instituteName} (IMS V2 Enterprise) • Generated on ${issueDateStr} • Reference #${receiptNo}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function GET(req, { params }) {
    let browser = null;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID" }, { status: 400 });
        }

        await connectDB();

        const fee = await Fee.findOne({ _id: new mongoose.Types.ObjectId(id), deletedAt: null })
            .populate({
                path: "batch",
                select: "name course",
                populate: { path: "course", select: "name code" }
            })
            .populate("student", "profile email enrollmentNumber")
            .populate("institute", "name branding address contactEmail contactPhone settings")
            .lean();

        if (!fee) {
            return NextResponse.json({ error: "Receipt record not found" }, { status: 404 });
        }

        // Ownership and access control
        if (session.user.role === 'student' && fee.student?._id?.toString() !== session.user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (session.user.role !== 'student' && session.user.institute?.id && fee.institute?._id?.toString() !== session.user.institute.id) {
            return NextResponse.json({ error: "Access denied: outside institute boundary" }, { status: 403 });
        }

        const rawLogoUrl = fee.institute?.branding?.logo || fee.institute?.logo;
        let logoBase64 = null;
        if (rawLogoUrl && rawLogoUrl.startsWith('http')) {
            try {
                const imgRes = await fetch(rawLogoUrl, { signal: AbortSignal.timeout(2500) });
                if (imgRes.ok) {
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const mime = imgRes.headers.get('content-type') || 'image/png';
                    logoBase64 = `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
                }
            } catch (err) {
                console.warn("Could not pre-fetch logo as base64, using raw URL:", err.message);
                logoBase64 = rawLogoUrl;
            }
        } else if (rawLogoUrl) {
            logoBase64 = rawLogoUrl;
        }

        const html = generateExecutiveReceiptHtml(fee, logoBase64);

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=medium'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '12mm',
                bottom: '12mm',
                left: '12mm',
                right: '12mm'
            }
        });

        await browser.close();
        browser = null;

        const filename = `Fee-Receipt-${fee._id.toString().slice(-8).toUpperCase()}.pdf`;

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'no-store, max-age=0'
            }
        });

    } catch (error) {
        console.error("Puppeteer Receipt PDF Generation Error:", error);
        if (browser) {
            try { await browser.close(); } catch (e) { /* ignore */ }
        }
        return NextResponse.json({ error: "Failed to generate receipt PDF: " + error.message }, { status: 500 });
    }
}
