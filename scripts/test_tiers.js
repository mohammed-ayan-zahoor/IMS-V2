const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

async function testTier(studentCount, expectedPct, expectedAdvance) {
    console.log(`\nTesting studentCount = ${studentCount} (Expected: ${expectedPct}% advance)...`);
    const payload = {
        schoolName: `Test Academy (${studentCount} Students)`,
        city: 'Pune, Maharashtra',
        studentCount: studentCount,
        duration: 1,
        rate: 59,
        // Send 0 so server calculates
        totalPrice: '₹0.00',
        upfrontPrice: '₹0.00'
    };

    const res = await fetch('http://localhost:3000/api/v1/mou/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`Docx generation failed with status ${res.status}: ${await res.text()}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = new PizZip(buf);
    const docXml = zip.file('word/document.xml').asText();

    // Check Clause 3
    if (!docXml.includes('staff training sessions (online), and technical documentation')) {
        throw new Error(`Clause 3 did not include '(online)' or still had 'on-site'!`);
    }
    if (docXml.includes('on-site')) {
        throw new Error(`Document still contains 'on-site'!`);
    }

    // Check Clause 4 text
    if (studentCount < 500) {
        if (!docXml.includes('100% upfront advance upon commencement of each academic year')) {
            throw new Error(`Clause 4 failed to include 100% advance text!`);
        }
    } else if (studentCount <= 1000) {
        if (!docXml.includes('75% upfront upon commencement of each academic year, and the remaining 25% immediately after platform implementation')) {
            throw new Error(`Clause 4 failed to include 75% advance text!`);
        }
    } else {
        if (!docXml.includes('50% upfront upon commencement of each academic year, and the remaining 50% immediately after platform implementation')) {
            throw new Error(`Clause 4 failed to include 50% advance text!`);
        }
    }

    // Check commercial table upfront
    const expectedFormatted = '₹' + expectedAdvance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (!docXml.includes(expectedFormatted)) {
        throw new Error(`Document did not contain expected upfront price ${expectedFormatted}!`);
    }

    console.log(`   ✓ Clause 3 has (online) and no on-site.`);
    console.log(`   ✓ Clause 4 has correct ${expectedPct}% advance wording.`);
    console.log(`   ✓ Upfront price calculated correctly as ${expectedFormatted}.`);
}

async function run() {
    // 1. Tier 1: 400 students -> 100% of (400 * 59 = 23,600) = 23,600
    await testTier(400, 100, 23600);

    // 2. Tier 2: 800 students -> 75% of (800 * 59 = 47,200) = 35,400
    await testTier(800, 75, 35400);

    // 3. Tier 3: 1200 students -> 50% of (1200 * 59 = 70,800) = 35,400
    await testTier(1200, 50, 35400);

    console.log('\n✅ ALL THREE TIERS VERIFIED SUCCESSFULLY ON SERVER API!');
}

run().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
