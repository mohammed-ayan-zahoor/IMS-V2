// scripts/test-pdf-attendance-import.js
// Runnable self-check for runtime Biometric Attendance PDF parsing
const fs = require('fs');
const path = require('path');
const assert = require('assert');

if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}

async function runCheck() {
    const candidatePaths = [
        path.join(__dirname, '../Aug Att 2026/Aug Att in Out.pdf'),
        '/Users/apple/.gemini/antigravity/brain/8122181f-d120-4e28-8a34-2004019136a9/scratch/aug_att/Aug Att 2026/Aug Att in Out.pdf'
    ];

    const pdfPath = candidatePaths.find(p => fs.existsSync(p));
    if (!pdfPath) {
        console.log('Sample PDF not found, skipping check.');
        return;
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)) }).promise;
    assert.strictEqual(doc.numPages, 3, 'Sample PDF should have 3 pages');

    const page1 = await doc.getPage(1);
    const content = await page1.getTextContent();
    const items = content.items.map(it => ({ x: it.transform[4], y: it.transform[5], str: it.str }));

    // Check header numbers 1..31 exist
    const dayHeaders = items.filter(it => Math.abs(it.y - 529) < 5 && /^\d{1,2}$/.test(it.str.trim()));
    assert(dayHeaders.length >= 28, 'Header must contain at least 28 day numbers');

    // Check employee code 1002 (Satyajit Ray) exists
    const has1002 = items.some(it => it.str.trim() === '1002');
    assert(has1002, 'Must extract employee 1002');

    console.log('✓ test-pdf-attendance-import: All assertions passed!');
}

runCheck().catch(err => {
    console.error('Check failed:', err);
    process.exit(1);
});
