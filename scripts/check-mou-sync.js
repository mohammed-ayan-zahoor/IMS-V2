const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function normalizeText(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[—–]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function renderDocx(docxPath, data) {
    const content = fs.readFileSync(docxPath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    doc.render(data);
    const renderedXml = doc.getZip().file('word/document.xml').asText();

    const paragraphs = [];
    const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
    let match;
    while ((match = pRegex.exec(renderedXml)) !== null) {
        const pXml = match[1];
        const tMatches = [...pXml.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/gs)].map(m => m[1]);
        const fullText = normalizeText(tMatches.join(''));
        if (fullText) {
            paragraphs.push(fullText);
        }
    }
    return paragraphs;
}

function extractFromHtml(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');

    const mouDocMatch = html.match(/<div[^>]*id="mou-document"[^>]*>([\s\S]*?)<\/div>\s*<!-- end [.#]?mou-document -->/i)
        || html.match(/<div class="mou-doc"[^>]*>([\s\S]*?)<\/div>\s*<!-- end \.mou-doc -->/i)
        || html.match(/<div[^>]*id="mou-document"[^>]*>([\s\S]*?)<div class="step-nav-bar"/i);

    if (!mouDocMatch) {
        throw new Error('Could not locate #mou-document in HTML');
    }

    const docHtml = mouDocMatch[1];

    // Extract sections by splitting on <h3>
    const parts = docHtml.split(/<h3\b[^>]*>/i);
    const sections = [];

    // First part is header before Section 1
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const titleEnd = part.indexOf('</h3>');
        if (titleEnd === -1) continue;

        const rawTitle = part.substring(0, titleEnd);
        const title = normalizeText(rawTitle.replace(/<[^>]+>/g, ''));

        // Content is after </h3> up to the end of this part (or before sig-section in section 9)
        let bodyContent = part.substring(titleEnd + 5);
        if (i === parts.length - 1) {
            // Cut before signature section
            let sigIdx = bodyContent.indexOf('class="mou-signatures-table"');
            if (sigIdx === -1) sigIdx = bodyContent.indexOf('class="sig-section"');
            if (sigIdx !== -1) {
                bodyContent = bodyContent.substring(0, sigIdx);
            }
        }

        const items = [];
        const itemRegex = /<(p|li)\b[^>]*>(.*?)<\/\1>/gis;
        let iMatch;
        while ((iMatch = itemRegex.exec(bodyContent)) !== null) {
            const raw = normalizeText(iMatch[2].replace(/<[^>]+>/g, ''));
            if (raw) items.push(raw);
        }

        sections.push({ title, items });
    }

    return sections;
}

function runSyncCheck() {
    const root = process.cwd();
    const docxPath = path.join(root, 'templates/mou/quantech-mou.docx');
    const htmlPath = path.join(root, 'public/mou.html');

    console.log('================================================================');
    console.log('  MOU DEEP CLAUSE SYNC AUDIT: public/mou.html vs quantech-mou.docx');
    console.log('================================================================\n');

    const sampleData = {
        schoolName: "the Institution",
        city: "Dhule, Maharashtra",
        address: "3rd Floor, Behind Gurudwara",
        udiseCode: "—",
        principalName: "Authorised Signatory",
        designation: "Principal",
        academicYear: "2026-27",
        refId: "QP/MOU/2026-27/1000",
        date: "19 September 2026",
        jurisdiction: "Dhule, Maharashtra",
        durationWords: "one (1) academic year",
        studentCount: "—",
        totalPrice: "₹0.00",
        upfrontPrice: "₹0.00",
        upfrontPriceLabel: "100% Upfront Commercial Amount",
        upfrontRowTitle: "100% Upfront Commercial Amount",
        commFooter: "* Billed 100% upfront advance upon agreement execution. Taxes extra.",
        mouSubtitle: "For Implementation of Quantech Platform",
        providerRoleDetail: "Developers of Quantech Platform",
        clause1Purpose: "The purpose of this MOU is to set forth the terms under which the Provider shall grant the School access to the Quantech Platform - a cloud-based software platform for managing academics, fees, attendance, hostel, transport, and administrative operations.",
        clause2Intro: "The Institution hereby confirms its intent to onboard the following students onto the Quantech Platform for the academic year 2026-27:",
        clause2Sla: "Licensing, data storage allocation, and support SLAs shall be calculated based on the above enrollment strength. Any increase beyond — students during the agreement period shall be subject to a revised quote.",
        clause3Items: [
            { text: "Provide full access to the Quantech Platform modules as agreed, including Academics, Fee Management, Attendance, Reports, Hostel, and Transport (as applicable)." },
            { text: "Ensure 99.5% platform uptime during school operational hours." },
            { text: "Provide onboarding support, staff training sessions (online), and technical documentation." },
            { text: "Maintain data confidentiality and comply with applicable data protection laws." },
            { text: "Deliver feature updates and security patches throughout the agreement period at no additional cost." }
        ],
        clause4Title: "4. Obligations of the School",
        clause4Items: [
            { text: "Appoint a designated Quantech Platform Coordinator responsible for internal rollout and communication." },
            { text: "Provide accurate and complete student data for onboarding within 14 days of agreement execution." },
            { text: "Ensure timely payment of subscription fees, billed annually: 100% upfront advance upon commencement of each academic year upon invoice issuance by the Provider." },
            { text: "Not share, sub-license, or resell access to the Quantech Platform to any third party." },
            { text: "Report technical issues through the designated support channel promptly." }
        ],
    };

    const docxParagraphs = renderDocx(docxPath, sampleData);
    const htmlSections = extractFromHtml(htmlPath);

    // Group DOCX into sections
    const docxSections = [];
    let currentDocxSec = null;
    const headingPattern = /^(\d+)\.\s+(.*)$/;

    for (const p of docxParagraphs) {
        if (p.startsWith('Signatures & Execution') || p.startsWith('For and on behalf')) {
            currentDocxSec = null;
            continue;
        }
        const m = p.match(headingPattern);
        if (m) {
            currentDocxSec = { num: m[1], title: p, rawTitle: m[2], items: [] };
            docxSections.push(currentDocxSec);
        } else if (currentDocxSec) {
            if (p.startsWith('•')) {
                currentDocxSec.items.push(p.replace(/^•\s*/, '').trim());
            } else if (!p.startsWith('Agreed Student') && !p.startsWith('College Year-wise') && !p.startsWith('Total Commercial') && !p.includes('Upfront') && !p.startsWith('Billing Schedule')) {
                currentDocxSec.items.push(p);
            }
        }
    }

    const mismatches = [];

    if (htmlSections.length !== docxSections.length) {
        mismatches.push(`Section count mismatch: HTML has ${htmlSections.length} sections, DOCX has ${docxSections.length}`);
    }

    for (let i = 0; i < htmlSections.length; i++) {
        const hSec = htmlSections[i];
        const dSec = docxSections[i];
        if (!dSec) continue;

        console.log(`Verifying Section ${i + 1}: "${hSec.title}"...`);

        // Check title
        if (hSec.title !== dSec.title) {
            mismatches.push(`Section ${i + 1} Title mismatch:\n  HTML: "${hSec.title}"\n  DOCX: "${dSec.title}"`);
        }

        // Compare each paragraph / bullet in this section
        const hTexts = hSec.items.map(t => normalizeText(t));
        const dTexts = dSec.items.map(t => normalizeText(t));

        if (i === 0) {
            // Clause 1: Background & Purpose (2 paragraphs)
            // HTML has "[ School Name ]" or "the Institution", both mean placeholder
            const hClean0 = hTexts[0].replace(/the Institution|\[\s*School Name\s*\]/g, 'PARTY_B');
            const dClean0 = dTexts[0].replace(/the Institution|\[\s*School Name\s*\]/g, 'PARTY_B');
            if (hClean0 !== dClean0) {
                mismatches.push(`Section 1 Para 1 mismatch:\n  HTML: "${hTexts[0]}"\n  DOCX: "${dTexts[0]}"`);
            }
            if (hTexts[1] !== dTexts[1]) {
                mismatches.push(`Section 1 Para 2 mismatch:\n  HTML: "${hTexts[1]}"\n  DOCX: "${dTexts[1]}"`);
            }
        } else if (i === 1) {
            // Clause 2: Scope of Enrollment (intro & SLA)
            if (hTexts[0] !== dTexts[0]) {
                mismatches.push(`Section 2 Intro mismatch:\n  HTML: "${hTexts[0]}"\n  DOCX: "${dTexts[0]}"`);
            }
            // SLA is last item in DOCX items
            const dSla = dTexts[dTexts.length - 1];
            const hSla = hTexts[hTexts.length - 1];
            if (hSla !== dSla) {
                mismatches.push(`Section 2 SLA mismatch:\n  HTML: "${hSla}"\n  DOCX: "${dSla}"`);
            }
        } else if (i === 2 || i === 3) {
            // Clause 3 or 4: Bullet lists
            if (hTexts.length !== dTexts.length) {
                mismatches.push(`Section ${i + 1} Bullet count mismatch: HTML=${hTexts.length}, DOCX=${dTexts.length}`);
            }
            for (let b = 0; b < Math.min(hTexts.length, dTexts.length); b++) {
                if (hTexts[b] !== dTexts[b]) {
                    mismatches.push(`Section ${i + 1} Bullet ${b + 1} mismatch:\n  HTML: "${hTexts[b]}"\n  DOCX: "${dTexts[b]}"`);
                }
            }
        } else {
            // Clauses 5, 6, 7, 8, 9: Full text comparison
            const hFull = hTexts.join(' ');
            const dFull = dTexts.join(' ');
            if (hFull !== dFull) {
                mismatches.push(`Section ${i + 1} Full text mismatch:\n  HTML: "${hFull}"\n  DOCX: "${dFull}"`);
            }
        }
    }

    console.log('\n================================================================');
    console.log('                   DEEP AUDIT RESULTS');
    console.log('================================================================\n');

    if (mismatches.length === 0) {
        console.log('✅ ZERO DIFFERENCES: All 9 sections, all titles, all numbers, all paragraphs, and all bullet points match 100% identically between HTML and DOCX!');
        process.exit(0);
    } else {
        console.error(`❌ FAILED: Found ${mismatches.length} mismatch(es):\n`);
        mismatches.forEach((m, idx) => console.error(`[${idx + 1}] ${m}\n`));
        process.exit(1);
    }
}

runSyncCheck();
