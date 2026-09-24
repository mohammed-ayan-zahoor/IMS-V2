import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";

export const runtime = 'nodejs';

function sanitizeString(val, maxLen = 200, fallback = '') {
    if (val === undefined || val === null) return fallback;
    const str = String(val).trim();
    return str.slice(0, maxLen);
}

function sanitizeFilename(name) {
    if (!name) return 'MOU_Quantech.docx';
    // Remove characters forbidden in Windows / POSIX filenames
    const clean = name.replace(/[/\\:*?"<>|]/g, '_').trim();
    return clean.endsWith('.docx') ? clean : `${clean}.docx`;
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

export async function POST(req) {
    try {
        const body = await req.json();

        // 1. Sanitize and validate inputs
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

        // 2. Load Word Template from templates/mou/quantech-mou.docx
        const templatePath = path.join(process.cwd(), 'templates', 'mou', 'quantech-mou.docx');
        if (!fs.existsSync(templatePath)) {
            console.error('Word MOU template missing at:', templatePath);
            return NextResponse.json({ error: "Master MOU template file is missing on the server" }, { status: 500 });
        }

        const templateBinary = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(templateBinary);

        // 3. Provider signature static image
        const providerSignPath = path.join(process.cwd(), 'public', 'assets', 'sign.png');
        const providerSignBuf = fs.existsSync(providerSignPath) ? fs.readFileSync(providerSignPath) : Buffer.from('');

        // 4. Setup Image Module
        const imageOptions = {
            centered: false,
            getImage: function (tagValue, tagName) {
                if (tagName === 'providerSignature') {
                    return providerSignBuf;
                }
                if (tagName === 'schoolSignature') {
                    if (typeof tagValue === 'string' && tagValue.startsWith('data:image')) {
                        const parts = tagValue.split(',');
                        if (parts[1]) return Buffer.from(parts[1], 'base64');
                    }
                    if (Buffer.isBuffer(tagValue)) return tagValue;
                }
                // Return 1x1 transparent PNG if no image available
                return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
            },
            getSize: function (img, tagValue, tagName) {
                // Fixed dimensions for signature box (160 x 60 px)
                return [160, 60];
            }
        };

        const imageModule = new ImageModule(imageOptions);

        const doc = new Docxtemplater(zip, {
            modules: [imageModule],
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: function (part) {
                console.warn(`[MOU docx] Missing tag in template: ${part.value}`);
                return '';
            }
        });

        // 5. Render Template
        const templateData = {
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
        };

        doc.render(templateData);

        const docxBuffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        const clientSchoolClean = schoolName.replace(/\s+/g, '_');
        const filename = sanitizeFilename(body.filename || `MOU_Quantech_${clientSchoolClean}_${academicYear}.docx`);

        return new Response(docxBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error("MOU Word (.docx) generation error:", error);
        return NextResponse.json({
            error: "Failed to generate Word document: " + (error.message || "Unknown error")
        }, { status: 500 });
    }
}
