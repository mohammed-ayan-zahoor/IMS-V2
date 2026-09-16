import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import mongoose from "mongoose";
import puppeteer from "puppeteer";

function generateReceiptHtml(fee) {
    const studentName = fee.student?.profile 
        ? `${fee.student.profile.firstName || ''} ${fee.student.profile.lastName || ''}`.trim()
        : 'Student';
    const studentEmail = fee.student?.email || 'N/A';
    const regNo = fee.student?.enrollmentNumber || 'STU20260005';
    const instituteName = fee.institute?.name || 'AQS';
    const batchName = fee.batch?.name || 'Batch 01';
    const courseName = fee.batch?.course?.name || 'DCA';
    const receiptNo = fee._id.toString().slice(-12).toUpperCase();

    const d = new Date(fee.createdAt || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth();
    const sessionStr = month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;

    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');
    const finalAmount = (fee.totalAmount || 0) - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
    const balanceAmount = Math.max(0, finalAmount - (fee.paidAmount || 0));

    const installmentRows = paidInstallments.map((inst, idx) => {
        const paidDateStr = inst.paidDate 
            ? new Date(inst.paidDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
            : 'VERIFIED DATE';
        const methodStr = (inst.paymentMethod || 'OFFLINE').replace('_', ' ').toUpperCase();
        const txRef = inst.transactionId ? ` • Ref: ${inst.transactionId}` : '';

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #F8F9FA; border-radius: 12px; border: 1px solid #E9ECEF; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: #E8F5E9; color: #2E7D32; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                        ✓
                    </div>
                    <div>
                        <div style="font-size: 14px; font-weight: 700; color: #1E1B2E;">Installment Payment #${idx + 1}</div>
                        <div style="font-size: 11px; font-weight: 600; color: #8D8A9B; margin-top: 2px;">
                            ${paidDateStr} • ${methodStr}${txRef}
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: 800; color: #1E1B2E;">₹${inst.amount.toLocaleString()}</div>
                    <div style="font-size: 10px; font-weight: 800; color: #2E7D32; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">VERIFIED</div>
                </div>
            </div>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Receipt #${receiptNo}</title>
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: #FFFFFF;
                color: #1E1B2E;
                padding: 32px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .receipt-card {
                background: #FFFFFF;
                border: 1px solid #E9E8F0;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
            }
            .header-banner {
                background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
                padding: 32px;
                color: #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .brand-block {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .logo-tile {
                width: 52px;
                height: 52px;
                background: #FFFFFF;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 18px;
                color: #0066FF;
            }
            .brand-name {
                font-size: 22px;
                font-weight: 900;
                letter-spacing: -0.5px;
                font-style: italic;
            }
            .brand-sub {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 2px;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.8);
                margin-top: 4px;
            }
            .receipt-meta {
                text-align: right;
            }
            .receipt-label {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.7);
            }
            .receipt-no {
                font-size: 18px;
                font-family: monospace;
                font-weight: 800;
                letter-spacing: 0.5px;
                margin-top: 2px;
            }
            .content-body {
                padding: 32px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 32px;
                padding-bottom: 24px;
                border-bottom: 1px solid #F1EFFB;
                margin-bottom: 24px;
            }
            .section-label {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #8D8A9B;
                margin-bottom: 8px;
            }
            .info-name {
                font-size: 16px;
                font-weight: 800;
                color: #1E1B2E;
            }
            .info-sub {
                font-size: 13px;
                font-style: italic;
                color: #555266;
                margin-top: 2px;
            }
            .info-meta {
                font-size: 12px;
                font-weight: 700;
                color: #0066FF;
                margin-top: 4px;
            }
            .breakdown-title {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #8D8A9B;
                margin-bottom: 14px;
            }
            .summary-section {
                display: flex;
                justify-content: flex-end;
                margin-top: 24px;
            }
            .summary-card {
                width: 300px;
                background: #F8F9FD;
                border: 1px solid #E9EBF5;
                border-radius: 14px;
                padding: 18px;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                margin-bottom: 8px;
            }
            .summary-row.total {
                font-weight: 800;
                color: #1E1B2E;
            }
            .summary-pills {
                display: flex;
                justify-content: space-between;
                margin-top: 14px;
                padding-top: 14px;
                border-top: 1px solid #E9EBF5;
            }
            .pill-label {
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #8D8A9B;
            }
            .pill-val-paid {
                font-size: 18px;
                font-weight: 900;
                color: #0066FF;
                margin-top: 2px;
            }
            .pill-val-due {
                font-size: 16px;
                font-weight: 800;
                color: #D97706;
                margin-top: 2px;
            }
            .footer-strip {
                margin-top: 32px;
                padding-top: 20px;
                border-top: 1px solid #F1EFFB;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #8D8A9B;
            }
            .seal-block {
                text-align: right;
            }
            .seal-title {
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #8D8A9B;
            }
            .seal-sign {
                font-size: 12px;
                font-weight: 800;
                color: #1E1B2E;
                font-style: italic;
                margin-top: 2px;
            }
        </style>
    </head>
    <body>
        <div class="receipt-card">
            <!-- Header Banner -->
            <div class="header-banner">
                <div class="brand-block">
                    <div class="logo-tile">
                        ${instituteName.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                        <div class="brand-name">${instituteName}</div>
                        <div class="brand-sub">Official Fee Receipt</div>
                    </div>
                </div>
                <div class="receipt-meta">
                    <div class="receipt-label">Receipt Number</div>
                    <div class="receipt-no">#${receiptNo}</div>
                </div>
            </div>

            <!-- Body -->
            <div class="content-body">
                <!-- Info Grid -->
                <div class="info-grid">
                    <div>
                        <div class="section-label">Student Information</div>
                        <div class="info-name">${studentName}</div>
                        <div class="info-sub">${studentEmail}</div>
                        <div class="info-meta">REG: ${regNo}</div>
                    </div>
                    <div>
                        <div class="section-label">Course Information</div>
                        <div class="info-name">${batchName}</div>
                        <div class="info-sub">${courseName}</div>
                        <div class="info-sub" style="color: #8D8A9B; font-size: 11px; margin-top: 4px;">
                            Academic Session ${sessionStr}
                        </div>
                    </div>
                </div>

                <!-- Payment Breakdown -->
                <div>
                    <div class="breakdown-title">Payment Breakdown</div>
                    ${installmentRows || '<p style="color: #8D8A9B; font-size: 12px;">No cleared installments recorded yet.</p>'}
                </div>

                <!-- Financial Summary -->
                <div class="summary-section">
                    <div class="summary-card">
                        <div class="summary-row total">
                            <span>TOTAL COURSE FEE</span>
                            <span>₹${finalAmount.toLocaleString()}</span>
                        </div>
                        <div class="summary-pills">
                            <div>
                                <div class="pill-label">Net Paid</div>
                                <div class="pill-val-paid">₹${(fee.paidAmount || 0).toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="pill-label">Outstanding</div>
                                <div class="pill-val-due">₹${balanceAmount.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Verification Footer -->
                <div class="footer-strip">
                    <div style="max-width: 360px; line-height: 1.4;">
                        This is an official computer-generated receipt issued by ${instituteName}. All transactions are recorded and verified under institute reference #${receiptNo}.
                    </div>
                    <div class="seal-block">
                        <div class="seal-title">Digitally Verified By</div>
                        <div class="seal-sign">Registrar & Accounts Counter</div>
                    </div>
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

        const html = generateReceiptHtml(fee);

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
                top: '8mm',
                bottom: '8mm',
                left: '8mm',
                right: '8mm'
            }
        });

        await browser.close();
        browser = null;

        const filename = `Receipt-${fee._id.toString().slice(-8).toUpperCase()}.pdf`;

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
