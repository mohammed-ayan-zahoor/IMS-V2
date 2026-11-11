/**
 * SDC Degree College (SDCDEGKOLAR) — Fee Concession & Discount Reconciliation Script
 * 
 * Reconciles the MSP / MSCP concessions across:
 *   - 1st Years (2026 Batch): Admission + Sem 1 MSCP
 *   - 2nd Years (2025 Batch): Sem 1, Sem 2, Sem 3 MSCP
 *   - 3rd Years (2024 Batch): Sem 1, Sem 2, Sem 3, Sem 4, Sem 5 MSCP
 * 
 * Sets:
 *   fee.totalAmount = baseFixation + mscp (full gross fee before concession)
 *   fee.discount = { amount: mscp, reason: 'Management Concession (MSCP)', status: 'applied' }
 *   fee.balanceAmount = Math.max(0, (fee.totalAmount - fee.discount.amount) - fee.paidAmount)
 * 
 * Installments already match (baseFixation), so the schema pre-save hook:
 *   expectedTotal = totalAmount - discount.amount === installmentsTotal
 * passes with 100% mathematical precision!
 * 
 * Usage:
 *   node scripts/reconcile-degree-discounts.js --dry-run
 *   node scripts/reconcile-degree-discounts.js
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function normalizeNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — CONCESSION (MSCP) RECONCILIATION');
    console.log('=================================================================');
    console.log(`Institute : SDCDEGKOLAR`);
    console.log(`Mode      : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
    console.log('-----------------------------------------------------------------\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const Institute = (await import('../models/Institute.js')).default;
    const Session = (await import('../models/Session.js')).default;
    const Batch = (await import('../models/Batch.js')).default;
    const User = (await import('../models/User.js')).default;
    const Fee = (await import('../models/Fee.js')).default;

    // 1. Resolve Institute
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
        process.exit(1);
    }
    console.log(`✅ Institute: ${inst.name} (${inst._id})`);

    // Resolve sessions
    const sessions = await Session.find({ instituteId: inst._id, deletedAt: null });
    const sessionMap = new Map();
    sessions.forEach(s => sessionMap.set(s.sessionName, s._id));

    let totalDiscountsApplied = 0;
    let totalDiscountAmount = 0;
    let totalFeesUpdated = 0;

    // =========================================================================
    // 1. RECONCILE 2026 BATCH (1ST YEARS)
    // =========================================================================
    console.log(`\n-----------------------------------------------------------------`);
    console.log(`1. Reconciling 2026 Batch (1st Years — Admission & Sem 1)`);
    console.log(`-----------------------------------------------------------------`);

    const admFile = path.join(__dirname, 'data', '2026 BATCH ADMISSION FEE DETAILS.xlsx');
    const semFile = path.join(__dirname, 'data', '2026 BATCH SEM FEE DETAILS.xlsx');

    if (fs.existsSync(admFile)) {
        const admWb = XLSX.readFile(admFile);
        const admData = XLSX.utils.sheet_to_json(admWb.Sheets['DATA'] || admWb.Sheets[admWb.SheetNames[0]], { header: 1 });

        const semMap = new Map();
        if (fs.existsSync(semFile)) {
            const semWb = XLSX.readFile(semFile);
            const semData = XLSX.utils.sheet_to_json(semWb.Sheets['DATA'] || semWb.Sheets[semWb.SheetNames[0]], { header: 1 });
            for (let r = 2; r < semData.length; r++) {
                const row = semData[r];
                if (!row) continue;
                const sid = String(row[7] || '').trim();
                // Store the full row so we can read both semGross (col 11) and semMscp (col 12)
                if (sid) semMap.set(sid, row);
            }
        }

        let b26Updated = 0;
        let b26Discount = 0;

        for (let r = 2; r < admData.length; r++) {
            const row = admData[r];
            if (!row || row.length === 0) continue;

            const studentId = String(row[7] || '').trim();
            const studentName = String(row[8] || '').trim();
            if (!studentId && !studentName) continue;

            const admMscp = normalizeNumber(row[12]);
            const semRow  = semMap.get(studentId);
            const semMscp = semRow ? normalizeNumber(semRow[12]) : 0;
            const totalMscp = admMscp + semMscp;

            if (totalMscp > 0) {
                // Find student
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

                if (!student) continue;

                // Find fee record for 2026-27 ODD SEM
                const fee = await Fee.findOne({
                    institute: inst._id,
                    student: student._id,
                    deletedAt: null
                });

                if (fee) {
                    const currentDiscount = fee.discount?.amount || 0;
                    if (currentDiscount !== totalMscp) {
                        // Derive the correct gross from Excel (admGross col 11 + semGross col 11)
                        // so we never add totalMscp onto a totalAmount that already bakes semMscp in.
                        const admGross = normalizeNumber(row[11]);
                        const semGross = semRow ? normalizeNumber(semRow[11]) : 0;
                        const correctGross = admGross + semGross;

                        if (!isDryRun) {
                            fee.totalAmount = correctGross; // set to true gross from Excel
                            fee.discount = {
                                amount: totalMscp,
                                reason: 'Management Concession (MSCP)',
                                status: 'applied',
                                appliedAt: new Date()
                            };
                            fee.balanceAmount = Math.max(0, correctGross - totalMscp - fee.paidAmount);
                            await fee.save();
                        }

                        b26Updated++;
                        b26Discount += (totalMscp - currentDiscount);
                    }
                }
            }
        }

        console.log(`✅ 2026 Batch Reconciled: ${b26Updated} fees | Concessions: ₹${b26Discount.toLocaleString('en-IN')}`);
        totalFeesUpdated += b26Updated;
        totalDiscountAmount += b26Discount;
    }

    // =========================================================================
    // 2. RECONCILE 2025 BATCH (2ND YEARS)
    // =========================================================================
    console.log(`\n-----------------------------------------------------------------`);
    console.log(`2. Reconciling 2025 Batch (2nd Years — Sem 1, Sem 2, Sem 3)`);
    console.log(`-----------------------------------------------------------------`);

    const b25File = path.join(__dirname, 'data', '2025 BATCH FEE DETAILS.xlsx');
    if (fs.existsSync(b25File)) {
        const wb25 = XLSX.readFile(b25File);
        const data25 = XLSX.utils.sheet_to_json(wb25.Sheets['DATA'] || wb25.Sheets[wb25.SheetNames[0]], { header: 1 });

        const semConfigs = [
            { semName: 'Sem 1', sessionKey: '2025-26 ODD SEM', mscpCol: 69 },
            { semName: 'Sem 2', sessionKey: '2025-26 EVEN SEM', mscpCol: 41 },
            { semName: 'Sem 3', sessionKey: '2026-27 ODD SEM', mscpCol: 14 }
        ];

        let b25Updated = 0;
        let b25Discount = 0;

        for (let r = 2; r < data25.length; r++) {
            const row = data25[r];
            if (!row || row.length === 0) continue;

            const studentId = String(row[8] || '').trim();
            if (!studentId) continue;

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

            if (!student) continue;

            for (const semCfg of semConfigs) {
                const mscp = normalizeNumber(row[semCfg.mscpCol]);
                if (mscp > 0) {
                    const sessId = sessionMap.get(semCfg.sessionKey);
                    if (!sessId) continue;

                    const fee = await Fee.findOne({
                        institute: inst._id,
                        student: student._id,
                        session: sessId,
                        deletedAt: null
                    });

                    if (fee) {
                        const currentDiscount = fee.discount?.amount || 0;
                        if (currentDiscount !== mscp) {
                            const newTotal = fee.totalAmount + mscp - currentDiscount;
                            if (!isDryRun) {
                                fee.totalAmount = newTotal;
                                fee.discount = {
                                    amount: mscp,
                                    reason: 'Management Concession (MSCP)',
                                    status: 'applied',
                                    appliedAt: new Date()
                                };
                                fee.balanceAmount = Math.max(0, (fee.totalAmount - mscp) - fee.paidAmount);
                                await fee.save();
                            }
                            b25Updated++;
                            b25Discount += (mscp - currentDiscount);
                        }
                    }
                }
            }
        }

        console.log(`✅ 2025 Batch Reconciled: ${b25Updated} fees | Concessions: ₹${b25Discount.toLocaleString('en-IN')}`);
        totalFeesUpdated += b25Updated;
        totalDiscountAmount += b25Discount;
    }

    // =========================================================================
    // 3. RECONCILE 2024 BATCH (3RD YEARS)
    // =========================================================================
    console.log(`\n-----------------------------------------------------------------`);
    console.log(`3. Reconciling 2024 Batch (3rd Years — Sem 1 to Sem 5)`);
    console.log(`-----------------------------------------------------------------`);

    const b24File = path.join(__dirname, 'data', '2024 BATCH FEE DETAILS.xlsx');
    if (fs.existsSync(b24File)) {
        const wb24 = XLSX.readFile(b24File);
        const data24 = XLSX.utils.sheet_to_json(wb24.Sheets['FEE'] || wb24.Sheets[wb24.SheetNames[0]], { header: 1 });

        const semConfigs24 = [
            { semName: 'Sem 1', sessionKey: '2024-25 ODD SEM', mscpCol: 135 },
            { semName: 'Sem 2', sessionKey: '2024-25 EVEN SEM', mscpCol: 109 },
            { semName: 'Sem 3', sessionKey: '2025-26 ODD SEM', mscpCol: 79 },
            { semName: 'Sem 4', sessionKey: '2025-26 EVEN SEM', mscpCol: 48 },
            { semName: 'Sem 5', sessionKey: '2026-27 ODD SEM', mscpCol: 17 }
        ];

        let b24Updated = 0;
        let b24Discount = 0;

        for (let r = 3; r < data24.length; r++) {
            const row = data24[r];
            if (!row || row.length === 0) continue;

            const studentId = String(row[9] || '').trim();
            if (!studentId) continue;

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

            if (!student) continue;

            for (const semCfg of semConfigs24) {
                const mscp = normalizeNumber(row[semCfg.mscpCol]);
                if (mscp > 0) {
                    const sessId = sessionMap.get(semCfg.sessionKey);
                    if (!sessId) continue;

                    const fee = await Fee.findOne({
                        institute: inst._id,
                        student: student._id,
                        session: sessId,
                        deletedAt: null
                    });

                    if (fee) {
                        const currentDiscount = fee.discount?.amount || 0;
                        if (currentDiscount !== mscp) {
                            const newTotal = fee.totalAmount + mscp - currentDiscount;
                            if (!isDryRun) {
                                fee.totalAmount = newTotal;
                                fee.discount = {
                                    amount: mscp,
                                    reason: 'Management Concession (MSCP)',
                                    status: 'applied',
                                    appliedAt: new Date()
                                };
                                fee.balanceAmount = Math.max(0, (fee.totalAmount - mscp) - fee.paidAmount);
                                await fee.save();
                            }
                            b24Updated++;
                            b24Discount += (mscp - currentDiscount);
                        }
                    }
                }
            }
        }

        console.log(`✅ 2024 Batch Reconciled: ${b24Updated} fees | Concessions: ₹${b24Discount.toLocaleString('en-IN')}`);
        totalFeesUpdated += b24Updated;
        totalDiscountAmount += b24Discount;
    }

    console.log('\n=================================================================');
    console.log('                      SUMMARY REPORT');
    console.log('=================================================================');
    console.log(`Mode                   : ${isDryRun ? 'DRY-RUN (no writes)' : 'LIVE'}`);
    console.log(`Total Fees Updated     : ${totalFeesUpdated}`);
    console.log(`Total Concessions (MSCP): ₹${totalDiscountAmount.toLocaleString('en-IN')}`);
    console.log('=================================================================\n');

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
