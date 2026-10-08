import puppeteer from 'puppeteer';
import Payslip from '@/models/Payslip';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// Number to Words INR helper
function numberToWordsINR(num) {
    const val = Number(num);
    if (!val || isNaN(val) || val === 0) return "Zero Rupees and Zero Paise";

    const parts = val.toFixed(2).split('.');
    let wholePart = parseInt(parts[0], 10);
    let decimalPart = parseInt(parts[1], 10);

    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) {
            const hundreds = Math.floor(n / 100);
            const remaining = n % 100;
            return a[hundreds] + ' Hundred' + (remaining !== 0 ? ' and ' + convert(remaining) : '');
        }
        return '';
    };

    let words = '';
    if (wholePart >= 10000000) {
        words += convert(Math.floor(wholePart / 10000000)) + ' Crore ';
        wholePart %= 10000000;
    }
    if (wholePart >= 100000) {
        words += convert(Math.floor(wholePart / 100000)) + ' Lakh ';
        wholePart %= 100000;
    }
    if (wholePart >= 1000) {
        words += convert(Math.floor(wholePart / 1000)) + ' Thousand ';
        wholePart %= 1000;
    }
    if (wholePart > 0) {
        words += convert(wholePart);
    }

    let result = (words.trim() || 'Zero') + ' Rupees';
    if (decimalPart > 0) {
        result += ' and ' + convert(decimalPart) + ' Paise';
    } else {
        result += ' and Zero Paise';
    }

    return result;
}

const getMonthName = (m) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const idx = parseInt(m, 10) - 1;
    return months[idx] || (m ? String(m) : '');
};

const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatAddress = (addr) => {
    if (!addr) return "Main Campus, Education Hub";
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
        const parts = [addr.street, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : "Main Campus, Education Hub";
    }
    return "Main Campus, Education Hub";
};

async function fetchAsBase64(url) {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    if (!url.startsWith('http')) return url;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const ab = await res.arrayBuffer();
            const mime = res.headers.get('content-type') || 'image/png';
            return `data:${mime};base64,${Buffer.from(ab).toString('base64')}`;
        }
    } catch {
        // Ignore timeout / fetch failure and fallback to url
    }
    return url;
}

export function generatePayslipHtml(payslip, logoBase64 = null, avatarBase64 = null) {
    const staff = payslip.staff || {};
    const staffProfile = staff.profile || {};
    const staffName = staffProfile.firstName 
        ? `${staffProfile.firstName} ${staffProfile.lastName || ''}`.trim() 
        : staff.fullName || "Staff Member";

    const designation = staff.hrDetails?.designation?.name || (staff.role === 'instructor' ? 'Faculty / Teacher' : 'Staff');
    const institute = payslip.institute || {};
    const instituteName = institute.name || "AQS Institute";
    const instituteLogo = logoBase64 || institute.branding?.logo || institute.logo;
    const staffAvatar = avatarBase64 || staffProfile.avatar;

    const yearVal = parseInt(payslip.year || new Date().getFullYear(), 10);
    const monthNum = parseInt(payslip.month || "1", 10);
    const monthName = getMonthName(monthNum);
    const lastDayOfMonth = new Date(yearVal, monthNum, 0).getDate();
    const payPeriodStr = `${monthName} 01 - ${lastDayOfMonth}, ${yearVal}`;
    const payDateStr = payslip.paymentDate 
        ? new Date(payslip.paymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
        : (payslip.createdAt ? new Date(payslip.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '-');

    const joiningDateStr = staff.hrDetails?.joiningDate 
        ? new Date(staff.hrDetails.joiningDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';

    const accountRef = staff.enrollmentNumber || staff.username || (payslip._id ? `EMP-${payslip._id.toString().slice(-6).toUpperCase()}` : 'EMP-001');

    // Filter duplicate basic salary
    const otherEarnings = (payslip.earnings || []).filter(e => {
        const n = (e.componentName || '').trim().toLowerCase();
        return n !== 'basic salary' && n !== 'basic';
    });

    const earningsList = [
        { name: "Basic Salary", amount: payslip.basicSalary || 0 },
        ...otherEarnings.map(e => ({ name: e.componentName, amount: e.amount || 0 }))
    ];

    // Deduplicate deductions
    const seenDeductions = new Set();
    const deductionsList = [];
    (payslip.deductions || []).forEach(d => {
        const norm = (d.componentName || '').trim().toLowerCase();
        if (!seenDeductions.has(norm)) {
            seenDeductions.add(norm);
            deductionsList.push({ name: d.componentName, amount: d.amount || 0 });
        }
    });

    const maxRows = Math.max(earningsList.length, deductionsList.length);
    const pairedRows = [];
    for (let i = 0; i < maxRows; i++) {
        pairedRows.push({
            earning: earningsList[i] || null,
            deduction: deductionsList[i] || null
        });
    }

    const grossSalary = earningsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalDeductions = deductionsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const netSalary = Number(payslip.netSalary) || 0;
    const netSalaryWords = numberToWordsINR(netSalary);

    const rowsHtml = pairedRows.map(row => `
        <tr>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; color: #334155; font-weight: 500; font-size: 11px;">
                ${row.earning ? row.earning.name : ''}
            </td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: 600; font-size: 11px;">
                ${row.earning ? `₹${formatCurrency(row.earning.amount)}` : ''}
            </td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; color: #334155; font-weight: 500; font-size: 11px;">
                ${row.deduction ? row.deduction.name : ''}
            </td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: 600; font-size: 11px;">
                ${row.deduction ? `₹${formatCurrency(row.deduction.amount)}` : ''}
            </td>
        </tr>
    `).join('');

    const attendanceHtml = payslip.attendanceSummary ? `
        <div style="border: 1px solid #CBD5E1; background: #F8FAFC; border-radius: 6px; padding: 8px 12px; margin-top: 14px; font-size: 10.5px; display: table; width: 100%;">
            <div style="display: table-row;">
                <div style="display: table-cell; text-align: center; color: #475569;">Present: <strong style="color: #0F172A;">${payslip.attendanceSummary.present || 0}d</strong></div>
                <div style="display: table-cell; text-align: center; color: #475569;">Absent: <strong style="color: #DC2626;">${payslip.attendanceSummary.absent || 0}d</strong></div>
                <div style="display: table-cell; text-align: center; color: #475569;">Half Day: <strong style="color: #0F172A;">${payslip.attendanceSummary.halfDay || 0}d</strong></div>
                <div style="display: table-cell; text-align: center; color: #475569;">Leave: <strong style="color: #0F172A;">${payslip.attendanceSummary.onLeave || 0}d</strong></div>
                <div style="display: table-cell; text-align: center; color: #475569;">Holidays: <strong style="color: #0F172A;">${payslip.attendanceSummary.holiday || 0}d</strong></div>
            </div>
        </div>
    ` : '';

    const paymentInfoHtml = payslip.paymentStatus === 'paid' ? `
        <div style="border: 1px solid #CBD5E1; background: #F8FAFC; border-radius: 6px; padding: 8px 12px; margin-top: 12px; font-size: 10px; display: table; width: 100%;">
            <div style="display: table-row;">
                <div style="display: table-cell; width: 25%; color: #475569;">Status: <strong style="color: #047857;">PAID</strong></div>
                <div style="display: table-cell; width: 30%; color: #475569;">Disbursed From: <strong style="color: #0F172A;">${payslip.disbursedFromAccount?.name || 'General Account'}</strong></div>
                <div style="display: table-cell; width: 20%; color: #475569;">Mode: <strong style="color: #0F172A;">${payslip.paymentMode || 'Cash'}</strong></div>
                <div style="display: table-cell; width: 25%; color: #475569;">Ref / UTR: <strong style="font-family: monospace; color: #0F172A;">${payslip.paymentReference || '—'}</strong></div>
            </div>
        </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Payslip - ${monthName} ${yearVal} - ${staffName}</title>
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
                line-height: 1.4;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .document-container {
                width: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 297mm;
            }
            .top-banner {
                background: #0F172A;
                color: #FFFFFF;
                padding: 14px 32px;
                letter-spacing: 4px;
                font-weight: 800;
                font-size: 13px;
                text-transform: uppercase;
            }
            .content-wrapper {
                padding: 24px 32px;
            }
            .header-table {
                width: 100%;
                border-bottom: 1px solid #E2E8F0;
                padding-bottom: 16px;
                margin-bottom: 16px;
            }
            .inst-name {
                font-size: 17px;
                font-weight: 900;
                color: #0F172A;
                text-transform: uppercase;
                letter-spacing: -0.2px;
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
            .photo-box {
                width: 72px;
                height: 86px;
                border: 1px solid #CBD5E1;
                border-radius: 4px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #F8FAFC;
            }
            .doc-heading {
                text-align: center;
                font-size: 14px;
                font-weight: 800;
                color: #0F172A;
                margin-bottom: 16px;
            }
            .summary-table {
                width: 100%;
                margin-bottom: 14px;
            }
            .summary-field-label {
                font-size: 11px;
                color: #475569;
                padding: 2.5px 0;
                width: 130px;
            }
            .summary-field-val {
                font-size: 11px;
                font-weight: 700;
                color: #0F172A;
                padding: 2.5px 0;
            }
            .net-pay-card {
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                overflow: hidden;
                text-align: center;
                background: #FFFFFF;
            }
            .net-pay-header {
                background: #F1F5F9;
                color: #1E293B;
                font-size: 10.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                padding: 7px 12px;
                border-bottom: 1px solid #CBD5E1;
            }
            .net-pay-amount {
                padding: 16px 12px;
                font-size: 26px;
                font-weight: 900;
                color: #0F172A;
                letter-spacing: -0.5px;
            }
            .ledger-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                overflow: hidden;
                margin-top: 14px;
            }
            .ledger-table th {
                background: #F1F5F9;
                color: #334155;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                padding: 8px 12px;
                border-bottom: 1px solid #CBD5E1;
            }
            .ledger-table tfoot td {
                background: #F8FAFC;
                padding: 9px 12px;
                font-size: 11px;
                font-weight: 800;
                color: #0F172A;
                border-top: 1px solid #CBD5E1;
            }
            .signature-section {
                margin-top: 36px;
                width: 100%;
                display: table;
            }
            .signature-col {
                display: table-cell;
                width: 50%;
                text-align: center;
            }
            .signature-line {
                width: 170px;
                border-top: 1px solid #64748B;
                margin: 0 auto;
                padding-top: 5px;
                font-size: 10.5px;
                font-weight: 700;
                color: #334155;
            }
            .bottom-banner {
                background: #F1F5F9;
                border-top: 1px solid #E2E8F0;
                padding: 12px 32px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10.5px;
                font-weight: 700;
                color: #0F172A;
            }
        </style>
    </head>
    <body>
        <div class="document-container">
            <div>
                <!-- Top Dark Banner -->
                <div class="top-banner">
                    P A Y S L I P
                </div>

                <div class="content-wrapper">
                    <!-- Institute Header & Staff Photo/ID -->
                    <table class="header-table" cellpadding="0" cellspacing="0">
                        <tr>
                            ${instituteLogo ? `
                            <td style="vertical-align: middle; width: 110px; padding-right: 14px;">
                                <img src="${instituteLogo}" alt="${instituteName}" style="max-height: 58px; max-width: 110px; object-fit: contain; display: block;" />
                            </td>
                            ` : ''}
                            <td style="vertical-align: middle;">
                                <div class="inst-name">${instituteName}</div>
                                <div class="inst-address">${formatAddress(institute.address)}</div>
                                <div class="inst-contact">
                                    Contact: ${institute.contactPhone || institute.contact || "+91 98765 43210"} | ${institute.contactEmail || institute.email || "hr@institute.edu"}
                                </div>
                            </td>
                            <td style="vertical-align: middle; width: 90px; text-align: right;">
                                <div style="display: inline-block; text-align: center;">
                                    ${staffAvatar ? `
                                        <img src="${staffAvatar}" alt="${staffName}" style="width: 70px; height: 82px; object-fit: cover; border-radius: 4px; border: 1px solid #CBD5E1;" />
                                    ` : `
                                        <div class="photo-box">
                                            <span style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Photo</span>
                                        </div>
                                    `}
                                    <div style="font-size: 9px; font-weight: 700; color: #334155; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 3px; padding: 1px 4px; margin-top: 3px;">
                                        ${accountRef}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Document Title -->
                    <div class="doc-heading">
                        Payslip for the Month of ${monthName} ${yearVal}
                    </div>

                    <!-- Pay Summary & Net Pay Box -->
                    <table class="summary-table" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="vertical-align: top; width: 62%; padding-right: 18px;">
                                <div style="font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                    Employee Pay Summary
                                </div>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td class="summary-field-label">Employee Name</td>
                                        <td class="summary-field-val">: ${staffName}</td>
                                    </tr>
                                    <tr>
                                        <td class="summary-field-label">Designation</td>
                                        <td class="summary-field-val">: ${designation}</td>
                                    </tr>
                                    <tr>
                                        <td class="summary-field-label">Date of Joining</td>
                                        <td class="summary-field-val">: ${joiningDateStr}</td>
                                    </tr>
                                    <tr>
                                        <td class="summary-field-label">Pay Period</td>
                                        <td class="summary-field-val">: ${payPeriodStr}</td>
                                    </tr>
                                    <tr>
                                        <td class="summary-field-label">Pay Date</td>
                                        <td class="summary-field-val">: ${payDateStr}</td>
                                    </tr>
                                    <tr>
                                        <td class="summary-field-label">Account / ID</td>
                                        <td class="summary-field-val">: ${accountRef}</td>
                                    </tr>
                                </table>
                            </td>
                            <td style="vertical-align: top; width: 38%;">
                                <div class="net-pay-card">
                                    <div class="net-pay-header">Employee Net Pay</div>
                                    <div class="net-pay-amount">₹${formatCurrency(netSalary)}</div>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Attendance Strip -->
                    ${attendanceHtml}

                    <!-- Main Earnings & Deductions Ledger -->
                    <table class="ledger-table" cellpadding="0" cellspacing="0">
                        <thead>
                            <tr>
                                <th style="text-align: left; width: 35%; border-right: 1px solid #CBD5E1;">EARNINGS</th>
                                <th style="text-align: right; width: 15%; border-right: 1px solid #CBD5E1;">AMOUNT</th>
                                <th style="text-align: left; width: 35%; border-right: 1px solid #CBD5E1;">DEDUCTIONS</th>
                                <th style="text-align: right; width: 15%;">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="border-right: 1px solid #CBD5E1;">Gross Salary</td>
                                <td style="border-right: 1px solid #CBD5E1; text-align: right; color: #0F172A;">₹${formatCurrency(grossSalary)}</td>
                                <td style="border-right: 1px solid #CBD5E1;">Total Deductions</td>
                                <td style="text-align: right; color: #DC2626;">₹${formatCurrency(totalDeductions)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Net Pay in Words & Note -->
                    <div style="margin-top: 14px; font-size: 11px;">
                        <div style="font-weight: 800; color: #0F172A;">
                            NET PAY: ₹${formatCurrency(netSalary)}
                        </div>
                        <div style="color: #475569; font-size: 10.5px; margin-top: 2px;">
                            Amount in Words: <strong style="color: #1E293B;">${netSalaryWords}</strong>
                        </div>
                    </div>

                    <!-- Payment Status info if paid -->
                    ${paymentInfoHtml}

                    <div style="border-top: 1px solid #E2E8F0; margin-top: 16px;"></div>

                    <!-- Signature Box -->
                    <div class="signature-section">
                        <div class="signature-col">
                            <div class="signature-line">Employee Signature</div>
                        </div>
                        <div class="signature-col">
                            <div class="signature-line">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Banner -->
            <div class="bottom-banner">
                <div style="max-width: 90%;">
                    TOTAL NET PAYABLE: &nbsp; ₹${formatCurrency(netSalary)} &nbsp; (${netSalaryWords})
                </div>
                <div style="font-size: 20px; font-weight: 900; color: #CBD5E1; text-transform: uppercase;">
                    ${instituteName.charAt(0) || 'Q'}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate PDF buffer for a payslip record
 */
export async function generatePayslipPdfBuffer(payslipId, instituteId = null) {
    await connectDB();

    const query = { _id: payslipId };
    if (instituteId) {
        query.institute = instituteId;
    }

    const payslip = await Payslip.findOne(query)
        .populate({
            path: 'staff',
            select: 'profile role email phone hrDetails username enrollmentNumber',
            populate: {
                path: 'hrDetails.designation',
                select: 'name'
            }
        })
        .populate('institute', 'name code address contact contactEmail contactPhone email logo branding settings')
        .populate('disbursedFromAccount', 'name accountType accountNumber phone')
        .populate('generatedBy', 'profile role')
        .lean();

    if (!payslip) {
        throw new Error('Payslip not found.');
    }

    // Pre-fetch images to base64
    const logoUrl = payslip.institute?.branding?.logo || payslip.institute?.logo;
    const avatarUrl = payslip.staff?.profile?.avatar;

    const [logoBase64, avatarBase64] = await Promise.all([
        fetchAsBase64(logoUrl),
        fetchAsBase64(avatarUrl)
    ]);

    const html = generatePayslipHtml(payslip, logoBase64, avatarBase64);

    let browser = null;
    try {
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
                top: '0mm',
                bottom: '0mm',
                left: '0mm',
                right: '0mm'
            }
        });

        return {
            pdfBuffer: Buffer.from(pdfBuffer),
            payslip,
            filename: `Payslip-${getMonthName(payslip.month)}-${payslip.year}.pdf`
        };
    } finally {
        if (browser) {
            try { await browser.close(); } catch {}
        }
    }
}
