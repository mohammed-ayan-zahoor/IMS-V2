/**
 * fix-2028-fee-dates.js
 *
 * Scans and corrects fee installments, payments, and student admission dates
 * where the year was incorrectly parsed or entered as 2028 instead of 2026
 * (e.g. DD/MM/YY day-year transposition in Excel import).
 *
 * Usage:
 *   node scripts/fix-2028-fee-dates.js --dry-run
 *   node scripts/fix-2028-fee-dates.js
 *
 * Options:
 *   --code <INST_CODE>   Target specific institute (default: SDCPUK)
 *   --all                Scan all institutes
 *   --dry-run            Report findings without making database changes
 */

'use strict';

process.removeAllListeners('warning');

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
}

function parseArgs() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const all = args.includes('--all');
    let code = 'SDCPUK';
    const codeIdx = args.indexOf('--code');
    if (codeIdx !== -1 && args[codeIdx + 1]) {
        code = args[codeIdx + 1].trim().toUpperCase();
    }
    return { dryRun, all, code };
}

function fixDateYear(d, targetYear = 2026) {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    if (dateObj.getFullYear() === 2028) {
        const corrected = new Date(dateObj);
        corrected.setFullYear(targetYear);
        return corrected;
    }
    return null;
}

async function main() {
    const { dryRun, all, code } = parseArgs();
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment or .env.local');
        process.exit(1);
    }

    console.log(`\n======================================================`);
    console.log(`🔧 Fee Date Year-2028 Correction Utility`);
    console.log(`   Target Institute: ${all ? 'ALL INSTITUTES' : code}`);
    console.log(`   Execution Mode  : ${dryRun ? 'DRY-RUN (No changes will be saved)' : 'LIVE EXECUTION'}`);
    console.log(`======================================================\n`);

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Register / load models
    const Institute = mongoose.models.Institute || mongoose.model('Institute', new mongoose.Schema({}, { strict: false }), 'institutes');
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Fee = mongoose.models.Fee || mongoose.model('Fee', new mongoose.Schema({}, { strict: false }), 'fees');
    const TransportFee = mongoose.models.TransportFee || mongoose.model('TransportFee', new mongoose.Schema({}, { strict: false }), 'transportfees');

    let instituteIds = [];
    if (!all) {
        const inst = await Institute.findOne({ code });
        if (!inst) {
            console.error(`❌ Institute with code "${code}" not found.`);
            await mongoose.disconnect();
            process.exit(1);
        }
        instituteIds = [inst._id];
        console.log(`🏫 Institute: ${inst.name || code} (_id: ${inst._id})`);
    } else {
        const allInsts = await Institute.find({});
        instituteIds = allInsts.map(i => i._id);
        console.log(`🏫 Scanning across ${instituteIds.length} institutes`);
    }

    // 1. Scan and fix Fee documents
    const feeFilter = { institute: { $in: instituteIds } };
    const fees = await Fee.find(feeFilter).populate({
        path: 'student',
        model: User,
        select: 'profile enrollmentNumber email'
    });

    console.log(`\n🔎 Checking ${fees.length} fee records for year 2028 dates...`);

    let feeFixCount = 0;
    let installmentFixCount = 0;
    let paymentFixCount = 0;

    for (const fee of fees) {
        let changed = false;
        const studentInfo = fee.student 
            ? `${fee.student.profile?.firstName || ''} ${fee.student.profile?.lastName || ''} (${fee.student.enrollmentNumber || fee.student._id})` 
            : `Student ID ${fee.student}`;

        // Check installments
        if (Array.isArray(fee.installments)) {
            for (let idx = 0; idx < fee.installments.length; idx++) {
                const inst = fee.installments[idx];
                
                // Check dueDate
                if (inst.dueDate) {
                    const fixedDue = fixDateYear(inst.dueDate, 2026);
                    if (fixedDue) {
                        console.log(`   [Inst #${idx + 1} DueDate] ${studentInfo}`);
                        console.log(`     Old: ${new Date(inst.dueDate).toISOString()} -> New: ${fixedDue.toISOString()}`);
                        inst.dueDate = fixedDue;
                        changed = true;
                        installmentFixCount++;
                    }
                }

                // Check paidDate
                if (inst.paidDate) {
                    const fixedPaid = fixDateYear(inst.paidDate, 2026);
                    if (fixedPaid) {
                        console.log(`   [Inst #${idx + 1} PaidDate] ${studentInfo}`);
                        console.log(`     Old: ${new Date(inst.paidDate).toISOString()} -> New: ${fixedPaid.toISOString()}`);
                        inst.paidDate = fixedPaid;
                        changed = true;
                        installmentFixCount++;
                    }
                }
            }
        }

        // Check payments
        if (Array.isArray(fee.payments)) {
            for (let pIdx = 0; pIdx < fee.payments.length; pIdx++) {
                const p = fee.payments[pIdx];
                if (p.paymentDate) {
                    const fixedPay = fixDateYear(p.paymentDate, 2026);
                    if (fixedPay) {
                        console.log(`   [Payment #${pIdx + 1} Date] ${studentInfo}`);
                        console.log(`     Old: ${new Date(p.paymentDate).toISOString()} -> New: ${fixedPay.toISOString()}`);
                        p.paymentDate = fixedPay;
                        changed = true;
                        paymentFixCount++;
                    }
                }
            }
        }

        if (changed) {
            feeFixCount++;
            if (!dryRun) {
                await Fee.updateOne(
                    { _id: fee._id },
                    { $set: { installments: fee.installments, payments: fee.payments } }
                );
            }
        }
    }

    // 2. Scan and fix TransportFee documents
    const transportFees = await TransportFee.find(feeFilter).populate({
        path: 'student',
        model: User,
        select: 'profile enrollmentNumber email'
    });
    console.log(`\n🔎 Checking ${transportFees.length} transport fee records for year 2028 dates...`);
    let transportFeeFixCount = 0;

    for (const tFee of transportFees) {
        let changed = false;
        const studentInfo = tFee.student
            ? `${tFee.student.profile?.firstName || ''} ${tFee.student.profile?.lastName || ''} (${tFee.student.enrollmentNumber || tFee.student._id})`
            : `Student ID ${tFee.student}`;

        if (Array.isArray(tFee.installments)) {
            for (let idx = 0; idx < tFee.installments.length; idx++) {
                const inst = tFee.installments[idx];
                if (inst.dueDate) {
                    const fixedDue = fixDateYear(inst.dueDate, 2026);
                    if (fixedDue) {
                        console.log(`   [Transport Inst #${idx + 1} DueDate] ${studentInfo}`);
                        console.log(`     Old: ${new Date(inst.dueDate).toISOString()} -> New: ${fixedDue.toISOString()}`);
                        inst.dueDate = fixedDue;
                        changed = true;
                        installmentFixCount++;
                    }
                }
                if (inst.paidDate) {
                    const fixedPaid = fixDateYear(inst.paidDate, 2026);
                    if (fixedPaid) {
                        console.log(`   [Transport Inst #${idx + 1} PaidDate] ${studentInfo}`);
                        console.log(`     Old: ${new Date(inst.paidDate).toISOString()} -> New: ${fixedPaid.toISOString()}`);
                        inst.paidDate = fixedPaid;
                        changed = true;
                        installmentFixCount++;
                    }
                }
            }
        }

        if (changed) {
            transportFeeFixCount++;
            if (!dryRun) {
                await TransportFee.updateOne(
                    { _id: tFee._id },
                    { $set: { installments: tFee.installments } }
                );
            }
        }
    }

    // 3. Scan and fix Student admission dates
    console.log(`\n🔎 Checking student admission dates for year 2028...`);
    const students = await User.find({ institute: { $in: instituteIds }, role: 'student', deletedAt: null });
    let studentFixCount = 0;

    for (const student of students) {
        if (student.admissionDate) {
            const fixedAdm = fixDateYear(student.admissionDate, 2026);
            if (fixedAdm) {
                console.log(`   [Student AdmissionDate] ${student.profile?.firstName || ''} ${student.profile?.lastName || ''} (${student.enrollmentNumber || student._id})`);
                console.log(`     Old: ${new Date(student.admissionDate).toISOString()} -> New: ${fixedAdm.toISOString()}`);
                studentFixCount++;
                if (!dryRun) {
                    await User.updateOne(
                        { _id: student._id },
                        { $set: { admissionDate: fixedAdm } }
                    );
                }
            }
        }
    }

    console.log(`\n======================================================`);
    console.log(`📊 Summary of Findings:`);
    console.log(`   - Academic Fees affected   : ${feeFixCount}`);
    console.log(`   - Transport Fees affected  : ${transportFeeFixCount}`);
    console.log(`   - Total Installments fixed : ${installmentFixCount}`);
    console.log(`   - Payments fixed           : ${paymentFixCount}`);
    console.log(`   - Students fixed           : ${studentFixCount}`);
    if (dryRun) {
        console.log(`\n⚠️  DRY-RUN completed. Run without --dry-run to apply changes to DB.`);
    } else {
        console.log(`\n✅ Database updated successfully!`);
    }
    console.log(`======================================================\n`);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
