/**
 * SDC Independent PU College (SDCPUK) — Fee Reconciliation Script
 * 
 * Reconciles missing fee records for students whose Fixation column was blank/zero
 * in the college Excel ledgers but who have paid installments (e.g. Suprith K S, Sabir Pasha,
 * and 25 I PU students totaling ~₹5,04,000).
 * 
 * Usage:
 *   node scripts/reconcile-pu-fees.js --dry-run
 *   node scripts/reconcile-pu-fees.js
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

function normalizeDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? null : d;
    }
    const str = String(val).trim();
    const parts = str.split(/[./-]/);
    if (parts.length === 3) {
        let [d, m, y] = parts.map(p => parseInt(p, 10));
        if (y < 100) y += 2000;
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt.getTime())) return dt;
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function parseName(fullName) {
    if (!fullName) return { firstName: 'Student', lastName: '' };
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('=================================================================');
    console.log('   SDCPUK — MISSING FEE RECONCILIATION SCRIPT');
    console.log('=================================================================');
    console.log(`Mode : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
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
    const Course = (await import('../models/Course.js')).default;
    const Batch = (await import('../models/Batch.js')).default;
    const User = (await import('../models/User.js')).default;
    const Fee = (await import('../models/Fee.js')).default;
    const Membership = (await import('../models/Membership.js')).default;

    // 1. Resolve Institute
    const inst = await Institute.findOne({
        $or: [
            { code: 'SDCPUK' },
            { code: 'SDCPU' },
            { name: { $regex: /independent pu/i } }
        ],
        deletedAt: null
    });

    if (!inst) {
        console.error('❌ Institute SDCPUK not found!');
        process.exit(1);
    }
    console.log(`✅ Institute: ${inst.name} (${inst._id})`);

    // 2. Resolve Active Session (using instituteId field!)
    let session = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        isActive: true,
        deletedAt: null
    }) || await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName: { $regex: /2026-27/i },
        deletedAt: null
    });

    if (!session) {
        // Fallback to any session for this institute
        session = await Session.findOne({
            $or: [{ instituteId: inst._id }, { institute: inst._id }],
            deletedAt: null
        });
    }

    console.log(`✅ Session  : ${session?.sessionName || 'N/A'} (${session?._id})\n`);

    const defaultHash = await bcrypt.hash('Student@123', 10);

    const filesToProcess = [
        {
            year: 'II PUC',
            coursePrefix: 'II PUC',
            feeFile: path.join(__dirname, 'data', 'II PU Fees 2026 - 27 (ARP).xlsx'),
            sheetName: 'Admission',
            headerRowIdx: 2,
            idColIdx: 3,
            altIdColIdx: 1,
            nameColIdx: 4,
            combColIdx: 6,
            secColIdx: 2,
            fixColIdx: 36,
            paidColIdx: 37,
            instStartCol: 16,
            instEndCol: 35
        },
        {
            year: 'I PUC',
            coursePrefix: 'I PUC',
            feeFile: path.join(__dirname, 'data', 'I PU Fees 2026 - 27 (ARP).xlsx'),
            sheetName: 'Admission',
            headerRowIdx: 0,
            idColIdx: 3,
            altIdColIdx: 3,
            nameColIdx: 5,
            combColIdx: 7,
            secColIdx: 1,
            fixColIdx: 26,
            paidColIdx: 27,
            instStartCol: 8,
            instEndCol: 25
        }
    ];

    let grandTotalPaidAdded = 0;
    let grandStudentsReconciled = 0;
    let grandStudentsCreated = 0;

    for (const cfg of filesToProcess) {
        console.log(`-----------------------------------------------------------------`);
        console.log(`Processing: ${cfg.year} (${path.basename(cfg.feeFile)})`);
        console.log(`-----------------------------------------------------------------`);

        if (!fs.existsSync(cfg.feeFile)) {
            console.warn(`⚠️  File not found: ${cfg.feeFile}`);
            continue;
        }

        const wb = XLSX.readFile(cfg.feeFile);
        const sheet = wb.Sheets[cfg.sheetName] || wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let fileReconciled = 0;
        let fileTotalPaid = 0;

        for (let r = cfg.headerRowIdx + 1; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue;

            const studentId = String(row[cfg.idColIdx] || row[cfg.altIdColIdx] || '').trim();
            const studentName = String(row[cfg.nameColIdx] || '').trim();
            if (!studentId && !studentName) continue;

            const combination = String(row[cfg.combColIdx] || '').trim();
            const sectionName = String(row[cfg.secColIdx] || 'A').trim();

            const fixation = normalizeNumber(row[cfg.fixColIdx]);
            const paidCol = normalizeNumber(row[cfg.paidColIdx]);

            // Parse installments
            const installments = [];
            let totalInstPaid = 0;
            let instNum = 1;

            for (let c = cfg.instStartCol; c <= cfg.instEndCol; c += 2) {
                const amt = normalizeNumber(row[c]);
                if (amt > 0) {
                    const rawDate = row[c + 1];
                    const paidDate = normalizeDate(rawDate) || new Date('2026-06-01');
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: amt,
                        dueDate: paidDate,
                        paidDate: paidDate,
                        status: 'paid',
                        paymentMethod: 'cash',
                        notes: `Installment #${instNum} — imported`
                    });
                    totalInstPaid += amt;
                    instNum++;
                }
            }

            const effectivePaid = totalInstPaid > 0 ? totalInstPaid : paidCol;

            // Target condition: Fixation is 0/empty, but student has paid > 0
            if (fixation <= 0 && effectivePaid > 0) {
                const safeId = studentId.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                const expectedEmail = `${safeId}@sdcpuk.edu.in`;

                // Query by enrollmentNumber, email, or name
                let student = await User.findOne({
                    institute: inst._id,
                    role: 'student',
                    $or: [
                        { enrollmentNumber: studentId },
                        { enrollmentNumber: { $regex: new RegExp(`^${studentId}$`, 'i') } },
                        { email: expectedEmail },
                        { email: { $regex: new RegExp(`^${safeId}@`, 'i') } },
                        { statsNo: studentId }
                    ],
                    deletedAt: null
                });

                // Fallback search by first name + last name
                if (!student && studentName) {
                    const { firstName, lastName } = parseName(studentName);
                    student = await User.findOne({
                        institute: inst._id,
                        role: 'student',
                        'profile.firstName': { $regex: new RegExp(`^${firstName}$`, 'i') },
                        ...(lastName ? { 'profile.lastName': { $regex: new RegExp(`^${lastName}$`, 'i') } } : {}),
                        deletedAt: null
                    });
                }

                // If student doesn't exist, create them
                if (!student) {
                    console.log(`  ➕ Student [${studentId}] ${studentName} not in DB -> Creating student...`);
                    const { firstName, lastName } = parseName(studentName);
                    
                    if (!isDryRun) {
                        student = await User.create({
                            institute: inst._id,
                            role: 'student',
                            email: expectedEmail,
                            passwordHash: defaultHash,
                            enrollmentNumber: studentId,
                            profile: {
                                firstName: firstName || 'Student',
                                lastName: lastName || ''
                            },
                            activeSession: session?._id,
                            activeSessions: session ? [session._id] : [],
                            admissionStd: `${cfg.coursePrefix} ${combination}`.trim()
                        });

                        await Membership.findOneAndUpdate(
                            { user: student._id, institute: inst._id },
                            { $setOnInsert: { user: student._id, institute: inst._id, role: 'student', isActive: true } },
                            { upsert: true }
                        );
                    } else {
                        student = { _id: new mongoose.Types.ObjectId(), fullName: studentName, enrollmentNumber: studentId };
                    }
                    grandStudentsCreated++;
                }

                // Resolve Course and Batch
                const courseNameRegex = new RegExp(`${cfg.coursePrefix}.*${combination}`, 'i');
                let course = await Course.findOne({
                    institute: inst._id,
                    name: { $regex: courseNameRegex },
                    deletedAt: null
                });

                if (!course) {
                    course = await Course.findOne({ institute: inst._id, deletedAt: null });
                }

                // Find batch
                let batch = await Batch.findOne({
                    institute: inst._id,
                    'enrolledStudents.student': student._id,
                    deletedAt: null
                });

                if (!batch && course) {
                    batch = await Batch.findOne({
                        institute: inst._id,
                        course: course._id,
                        name: { $regex: new RegExp(`^${sectionName}`, 'i') },
                        deletedAt: null
                    }) || await Batch.findOne({
                        institute: inst._id,
                        course: course._id,
                        deletedAt: null
                    });

                    // Enroll student in batch if not enrolled
                    if (batch && !isDryRun) {
                        await Batch.updateOne(
                            { _id: batch._id, 'enrolledStudents.student': { $ne: student._id } },
                            { $push: { enrolledStudents: { student: student._id, enrolledAt: new Date(), status: 'active' } } }
                        );
                    }
                }

                const totalAmount = effectivePaid; // Base fee fixed to at least paid amount
                const balanceAmount = 0;

                const existingFee = await Fee.findOne({
                    institute: inst._id,
                    student: student._id,
                    deletedAt: null
                });

                console.log(`  👉 [${studentId}] ${studentName || student.fullName}:`);
                console.log(`     Total Paid to Add: ₹${effectivePaid.toLocaleString('en-IN')} (${installments.length} installments) | Existing: ${existingFee ? `₹${existingFee.paidAmount}` : 'NONE'}`);

                if (!isDryRun) {
                    if (existingFee) {
                        existingFee.totalAmount = Math.max(existingFee.totalAmount, totalAmount);
                        existingFee.paidAmount = effectivePaid;
                        existingFee.balanceAmount = Math.max(0, existingFee.totalAmount - effectivePaid);
                        existingFee.status = existingFee.balanceAmount <= 0 ? 'paid' : 'partial';
                        if (installments.length > 0) existingFee.installments = installments;
                        if (batch && !existingFee.batch) existingFee.batch = batch._id;
                        if (session && !existingFee.session) existingFee.session = session._id;
                        await existingFee.save();
                    } else {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: batch?._id,
                            session: session?._id,
                            totalAmount: totalAmount,
                            paidAmount: effectivePaid,
                            balanceAmount: balanceAmount,
                            status: 'paid',
                            installments
                        });
                    }
                }

                fileReconciled++;
                fileTotalPaid += effectivePaid;
            }
        }

        console.log(`\n✅ ${cfg.year} Reconciled: ${fileReconciled} students | Total Paid Added: ₹${fileTotalPaid.toLocaleString('en-IN')}\n`);
        grandStudentsReconciled += fileReconciled;
        grandTotalPaidAdded += fileTotalPaid;
    }

    console.log('=================================================================');
    console.log('                      SUMMARY REPORT');
    console.log('=================================================================');
    console.log(`Mode                   : ${isDryRun ? 'DRY-RUN (no writes)' : 'LIVE'}`);
    console.log(`Total Students Updated : ${grandStudentsReconciled}`);
    console.log(`New Students Created   : ${grandStudentsCreated}`);
    console.log(`Total Fee Collections  : ₹${grandTotalPaidAdded.toLocaleString('en-IN')}`);
    console.log('=================================================================\n');

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
