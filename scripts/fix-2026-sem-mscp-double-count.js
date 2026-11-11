/**
 * fix-2026-sem-mscp-double-count.js
 *
 * Fixes 33 students in SDC Degree College (SDCDEGKOLAR) 2026 Batch (1st Year)
 * whose `fee.totalAmount` was over-set by exactly their Sem 1 MSCP due to a
 * double-counting bug in onboard-degree-college.js + reconcile-degree-discounts.js.
 *
 * BUG SUMMARY:
 *   onboard script used: totalAmount = admFixation(NET) + semGross   <- semMscp inside
 *   reconcile script then: totalAmount += totalMscp                  <- adds semMscp AGAIN
 *   Net result: totalAmount = excelGross + semMscp  (₹semMscp too high)
 *
 * FIX: Set fee.totalAmount = admGross + semGross (true gross), keeping discount unchanged.
 *      The pre-save hook auto-reduces the pending installment(s) accordingly.
 *
 * GUARDS (skips student if any fail — safe to re-run):
 *   - fee not found
 *   - fee.totalAmount !== expectedBuggedTotal   (someone already edited it manually)
 *   - fee.discount.amount !== excelDiscount     (discount was manually changed)
 *   - fee.totalAmount === excelGross             (already fixed — idempotent)
 *   - pendingSum < semMscp                       (all paid already, can't reduce)
 *
 * Usage:
 *   node scripts/fix-2026-sem-mscp-double-count.js --dry-run
 *   node scripts/fix-2026-sem-mscp-double-count.js
 *
 * Run on PRODUCTION server after `git pull`:
 *   cd ~/apps/ims-v2
 *   node scripts/fix-2026-sem-mscp-double-count.js --dry-run
 *   node scripts/fix-2026-sem-mscp-double-count.js
 */

'use strict';

// Suppress Node 22+ typeless package.json ESM warning when dynamically importing models
process.removeAllListeners('warning');

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// ============================================================================
// HELPERS
// ============================================================================

function normalizeNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function fmt(n) {
    return `₹${n.toLocaleString('en-IN')}`;
}

// ============================================================================
// MAIN
// ============================================================================

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('=================================================================');
    console.log('  SDC DEGREE COLLEGE — FIX 2026 BATCH SEM MSCP DOUBLE-COUNT');
    console.log('=================================================================');
    console.log(`Institute : SDCDEGKOLAR`);
    console.log(`Mode      : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
    console.log('-----------------------------------------------------------------\n');

    // -------------------------------------------------------------------------
    // 1. Connect to MongoDB
    // -------------------------------------------------------------------------
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Load models using dynamic import (models are ESM; this script is CJS like onboard-degree-college.js)
    const Institute = (await import('../models/Institute.js')).default;
    const User      = (await import('../models/User.js')).default;
    const Fee       = (await import('../models/Fee.js')).default;

    // -------------------------------------------------------------------------
    // 2. Resolve Institute
    // -------------------------------------------------------------------------
    const inst = await Institute.findOne({
        $or: [
            { code: 'SDCDEGKOLAR' },
            { code: 'SDCDEG' },
            { name: { $regex: /danamma/i } }
        ],
        deletedAt: null
    });

    if (!inst) {
        console.error('❌ Institute SDCDEGKOLAR not found!');
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log(`✅ Institute: ${inst.name} (${inst._id})\n`);

    // -------------------------------------------------------------------------
    // 3. Load Excel files
    // -------------------------------------------------------------------------
    const admFile = path.join(__dirname, 'data', '2026 BATCH ADMISSION FEE DETAILS.xlsx');
    const semFile = path.join(__dirname, 'data', '2026 BATCH SEM FEE DETAILS.xlsx');

    if (!fs.existsSync(admFile)) {
        console.error(`❌ Admission file not found: ${admFile}`);
        await mongoose.disconnect();
        process.exit(1);
    }
    if (!fs.existsSync(semFile)) {
        console.error(`❌ Sem file not found: ${semFile}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const admWb   = XLSX.readFile(admFile);
    const admData = XLSX.utils.sheet_to_json(
        admWb.Sheets['DATA'] || admWb.Sheets[admWb.SheetNames[0]],
        { header: 1 }
    );

    const semWb   = XLSX.readFile(semFile);
    const semData = XLSX.utils.sheet_to_json(
        semWb.Sheets['DATA'] || semWb.Sheets[semWb.SheetNames[0]],
        { header: 1 }
    );

    // Build semMap: studentId -> full row (we need col 11 gross and col 12 MSCP)
    const semMap = new Map();
    for (let r = 2; r < semData.length; r++) {
        const row = semData[r];
        if (!row) continue;
        const sid = String(row[7] || '').trim();
        if (sid) semMap.set(sid, row);
    }

    console.log(`📂 Admission rows loaded : ${admData.length - 2}`);
    console.log(`📂 Sem rows loaded       : ${semData.length - 2}\n`);

    // -------------------------------------------------------------------------
    // 4. Process each student
    // -------------------------------------------------------------------------
    const results = [];

    // Counters
    let cntFixed        = 0;
    let cntAlreadyFixed = 0;
    let cntSkipNoSemMscp = 0;
    let cntSkipNoFee    = 0;
    let cntSkipUnexpected = 0;
    let cntSkipOverpaid = 0;
    let cntErrors       = 0;
    let totalReduced    = 0;

    for (let r = 2; r < admData.length; r++) {
        const r1 = admData[r];
        if (!r1 || r1.length === 0) continue;

        const studentId   = String(r1[7] || '').trim();
        const studentName = String(r1[8] || '').trim();
        if (!studentId && !studentName) continue;
        if (!studentId) continue;

        // --- Read Excel values ---
        const admGross  = normalizeNumber(r1[11]); // Col L: gross admission fee
        const admMscp   = normalizeNumber(r1[12]); // Col M: admission concession
        const r2        = semMap.get(studentId) || [];
        const semGross  = normalizeNumber(r2[11]); // Col L: gross sem 1 fee
        const semMscp   = normalizeNumber(r2[12]); // Col M: sem 1 concession

        // Only 33 students have semMscp > 0 — skip the rest
        if (semMscp <= 0) {
            cntSkipNoSemMscp++;
            continue;
        }

        // --- Computed expected values ---
        const excelGross        = admGross + semGross;             // correct totalAmount (gross)
        const excelDiscount     = admMscp + semMscp;               // correct discount
        const expectedBuggedTotal = excelGross + semMscp;          // what the buggy scripts set

        // --- Find student in DB ---
        const student = await User.findOne({
            institute: inst._id,
            role: 'student',
            $or: [
                { studentId: studentId },
                { enrollmentNumber: studentId },
                { email: `${studentId.toLowerCase()}@sdcdeg.edu.in` }
            ],
            deletedAt: null
        });

        if (!student) {
            results.push({ studentId, studentName, semMscp, action: 'SKIP:NO_STUDENT', note: 'Student not found in DB' });
            cntSkipNoFee++;
            continue;
        }

        // --- Find fee record(s) ---
        // We filter to the fee whose totalAmount matches the expected bugged value
        // to avoid touching other fee records (e.g. 2nd/3rd sem fees if any)
        const allFees = await Fee.find({
            institute: inst._id,
            student: student._id,
            deletedAt: null
        });

        if (allFees.length === 0) {
            results.push({ studentId, studentName, semMscp, action: 'SKIP:NO_FEE', note: 'No fee record found' });
            cntSkipNoFee++;
            continue;
        }

        // Find the fee that matches the bugged total (or already-fixed gross)
        const buggedFees  = allFees.filter(f => Math.abs(f.totalAmount - expectedBuggedTotal) < 0.01);
        const fixedFees   = allFees.filter(f => Math.abs(f.totalAmount - excelGross) < 0.01);

        // ---- GUARD: Already fixed ----
        if (buggedFees.length === 0 && fixedFees.length > 0) {
            const fixedFee = fixedFees[0];
            // Confirm discount is also correct
            const disc = fixedFee.discount?.amount || 0;
            if (Math.abs(disc - excelDiscount) < 0.01) {
                results.push({
                    studentId, studentName, semMscp,
                    action: 'SKIP:ALREADY_FIXED',
                    note: `totalAmount=${fmt(fixedFee.totalAmount)}, discount=${fmt(disc)} ✓`
                });
                cntAlreadyFixed++;
                continue;
            }
        }

        if (buggedFees.length === 0) {
            // Neither bugged nor correctly fixed — unexpected state (manual edit?)
            const totals = allFees.map(f => fmt(f.totalAmount)).join(', ');
            results.push({
                studentId, studentName, semMscp,
                action: 'SKIP:UNEXPECTED_TOTAL',
                note: `Expected ${fmt(expectedBuggedTotal)} or ${fmt(excelGross)}, found: ${totals}`
            });
            cntSkipUnexpected++;
            continue;
        }

        if (buggedFees.length > 1) {
            results.push({
                studentId, studentName, semMscp,
                action: 'SKIP:MULTIPLE_MATCH',
                note: `${buggedFees.length} fees match the bugged total — manual review needed`
            });
            cntSkipUnexpected++;
            continue;
        }

        const fee = buggedFees[0];

        // ---- GUARD: Discount sanity ----
        const currentDiscount = fee.discount?.amount || 0;
        if (Math.abs(currentDiscount - excelDiscount) > 0.01) {
            results.push({
                studentId, studentName, semMscp,
                action: 'SKIP:UNEXPECTED_DISCOUNT',
                note: `Expected discount ${fmt(excelDiscount)}, found ${fmt(currentDiscount)} — manual edit detected`
            });
            cntSkipUnexpected++;
            continue;
        }

        // ---- DETERMINE FIX STRATEGY ----
        const pendingInsts = fee.installments.filter(i => i.status === 'pending');
        const pendingSum   = pendingInsts.reduce((s, i) => s + i.amount, 0);

        const isFullyPaid = (pendingSum === 0 && Math.abs(fee.balanceAmount) < 0.01);
        const hasPendingBalance = (pendingSum >= semMscp - 0.01);

        if (!hasPendingBalance && !isFullyPaid) {
            // Partial pending balance but less than semMscp (rare edge case)
            results.push({
                studentId, studentName, semMscp,
                action: 'SKIP:PARTIAL_OVERPAID',
                note: `pendingSum=${fmt(pendingSum)} < semMscp=${fmt(semMscp)} — manual review needed`
            });
            cntSkipOverpaid++;
            continue;
        }

        // ---- WHAT WILL CHANGE ----
        const oldTotal    = fee.totalAmount;
        const newTotal    = excelGross;
        const oldNet      = oldTotal - currentDiscount;
        const newNet      = newTotal - excelDiscount;

        if (hasPendingBalance) {
            // Case 1: Student has pending installment(s) -> pre-save hook auto-reduces pending
            const oldPending = pendingSum;
            const newPending = pendingSum - semMscp;

            if (isDryRun) {
                results.push({
                    studentId, studentName, semMscp,
                    action: 'DRY-RUN:WOULD_FIX (PENDING)',
                    note: `totalAmount ${fmt(oldTotal)} → ${fmt(newTotal)} | net ${fmt(oldNet)} → ${fmt(newNet)} | pending ${fmt(oldPending)} → ${fmt(newPending)}`
                });
                cntFixed++;
                totalReduced += semMscp;
            } else {
                try {
                    fee.totalAmount = newTotal;
                    fee.components  = [
                        { name: 'Admission Fee',          amount: admGross },
                        { name: 'Semester 1 Tuition Fee', amount: semGross }
                    ];
                    await fee.save();

                    const saved = await Fee.findById(fee._id).lean();
                    const savedPending = (saved.installments || [])
                        .filter(i => i.status === 'pending')
                        .reduce((s, i) => s + i.amount, 0);

                    results.push({
                        studentId, studentName, semMscp,
                        action: 'FIXED (PENDING)',
                        note: `totalAmount ${fmt(oldTotal)} → ${fmt(saved.totalAmount)} | net ${fmt(oldNet)} → ${fmt(saved.totalAmount - saved.discount?.amount)} | pending ${fmt(oldPending)} → ${fmt(savedPending)}`
                    });
                    cntFixed++;
                    totalReduced += semMscp;
                } catch (err) {
                    results.push({
                        studentId, studentName, semMscp,
                        action: 'ERROR:SAVE_FAILED',
                        note: err.message
                    });
                    cntErrors++;
                    console.error(`  ❌ ${studentId} ${studentName}: ${err.message}`);
                }
            }
        } else if (isFullyPaid) {
            // Case 2: Fully paid student in Excel (balance === 0).
            // During onboarding, the auto-balance line absorbed semMscp into the last paid installment.
            // We reduce the last paid installment by semMscp so paidAmount matches true receipts.
            const lastInst = fee.installments[fee.installments.length - 1];
            if (!lastInst || lastInst.amount < semMscp - 0.01) {
                results.push({
                    studentId, studentName, semMscp,
                    action: 'SKIP:FULLY_PAID_UNEXPECTED',
                    note: `Last installment amount ${fmt(lastInst?.amount || 0)} < semMscp ${fmt(semMscp)}`
                });
                cntSkipOverpaid++;
                continue;
            }

            const oldPaid = fee.paidAmount;
            const newPaid = oldPaid - semMscp;

            if (isDryRun) {
                results.push({
                    studentId, studentName, semMscp,
                    action: 'DRY-RUN:WOULD_FIX (FULLY_PAID)',
                    note: `totalAmount ${fmt(oldTotal)} → ${fmt(newTotal)} | paid ${fmt(oldPaid)} → ${fmt(newPaid)} | balance ₹0 (unchanged)`
                });
                cntFixed++;
                totalReduced += semMscp;
            } else {
                try {
                    // Reduce last installment by semMscp so installments sum === newTotal - discount
                    lastInst.amount = Math.round((lastInst.amount - semMscp) * 100) / 100;
                    fee.totalAmount = newTotal;
                    fee.components  = [
                        { name: 'Admission Fee',          amount: admGross },
                        { name: 'Semester 1 Tuition Fee', amount: semGross }
                    ];
                    await fee.save();

                    const saved = await Fee.findById(fee._id).lean();
                    results.push({
                        studentId, studentName, semMscp,
                        action: 'FIXED (FULLY_PAID)',
                        note: `totalAmount ${fmt(oldTotal)} → ${fmt(saved.totalAmount)} | paid ${fmt(oldPaid)} → ${fmt(saved.paidAmount)} | balance ₹0`
                    });
                    cntFixed++;
                    totalReduced += semMscp;
                } catch (err) {
                    results.push({
                        studentId, studentName, semMscp,
                        action: 'ERROR:SAVE_FAILED',
                        note: err.message
                    });
                    cntErrors++;
                    console.error(`  ❌ ${studentId} ${studentName}: ${err.message}`);
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // 5. Print Summary Table
    // -------------------------------------------------------------------------
    console.log('\n=================================================================');
    console.log('                      RESULTS TABLE');
    console.log('=================================================================');
    console.log(
        `${'STUDENT ID'.padEnd(14)} ${'NAME'.padEnd(28)} ${'EXTRA'.padStart(8)}  ACTION / NOTE`
    );
    console.log('-'.repeat(90));

    for (const r of results) {
        const extra = fmt(r.semMscp).padStart(8);
        const id    = r.studentId.padEnd(14);
        const name  = r.studentName.substring(0, 28).padEnd(28);
        const icon  = r.action.startsWith('FIXED')       ? '✅' :
                      r.action.startsWith('DRY')         ? '🔵' :
                      r.action.startsWith('SKIP:ALREADY') ? '✓ ' :
                      r.action.startsWith('SKIP:NO')     ? '⚠️ ' :
                      r.action.startsWith('ERROR')       ? '❌' : '⚠️ ';
        console.log(`${id} ${name} ${extra}  ${icon} ${r.action}: ${r.note}`);
    }

    console.log('\n=================================================================');
    console.log('                      SUMMARY');
    console.log('=================================================================');
    console.log(`Mode              : ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`Fixed (or would)  : ${cntFixed}  (${fmt(totalReduced)} total reduction)`);
    console.log(`Already correct   : ${cntAlreadyFixed}`);
    console.log(`Skipped (no fee)  : ${cntSkipNoFee}`);
    console.log(`Skipped (overpaid): ${cntSkipOverpaid}`);
    console.log(`Skipped (unexpected):`);
    console.log(`                    ${cntSkipUnexpected}`);
    console.log(`Errors            : ${cntErrors}`);
    console.log(`Students w/o semMSCP (not affected): ${cntSkipNoSemMscp}`);

    if (isDryRun) {
        console.log('\n⚠️  DRY-RUN complete. Run without --dry-run to apply changes.');
    } else {
        console.log('\n✅ LIVE run complete.');
        if (cntSkipOverpaid > 0) {
            console.log(`\n⚠️  ${cntSkipOverpaid} student(s) need MANUAL REVIEW (fully/over-paid, cannot auto-reduce).`);
        }
        if (cntErrors > 0) {
            console.log(`\n❌ ${cntErrors} error(s) occurred. Check logs above.`);
        }
    }

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
