/**
 * Smt. Danamma Channabasavaiah Degree College (SDCDEGKOLAR)
 * 3rd Year (2024 Batch) — Multi-Session Student, Batch & Fee Onboarding Script
 *
 * Reads:
 *   - scripts/data/2024 BATCH FEE DETAILS.xlsx (Sheet: 'FEE')
 *
 * Automatically manages:
 *   - Historical Sessions:
 *       - "2024-25 ODD SEM"  (Sem 1, isActive: false)
 *       - "2024-25 EVEN SEM" (Sem 2, isActive: false)
 *       - "2025-26 ODD SEM"  (Sem 3, isActive: false)
 *       - "2025-26 EVEN SEM" (Sem 4, isActive: false)
 *   - Current Active Session:
 *       - "2026-27 ODD SEM"  (Sem 5, isActive: true)
 *   - Batches across all 5 semesters (Sem 1 to Sem 5) under BCOM, BCA, BBA, BSC (CBZ/PCM/PMCS)
 *   - Enrolls 539 students across all 5 batches (Sem 1-4 completed, Sem 5 active)
 *   - Ingests reconciled Fee ledgers with historical & live installment tracking
 *
 * Usage:
 *   node scripts/onboard-degree-3rd-year.js --dry-run
 *   node scripts/onboard-degree-3rd-year.js
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// HELPERS
// ============================================================================

function normalizeDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    if (typeof val === 'string') {
        const cleaned = val.trim();
        if (!cleaned) return null;
        const ddmmyyyy = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
        if (ddmmyyyy) {
            let yr = +ddmmyyyy[3];
            if (yr < 100) yr += 2000;
            return new Date(yr, +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
        }
        const parsed = new Date(cleaned);
        if (!isNaN(parsed)) return parsed;
    }
    return null;
}

function normalizeNumber(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const num = parseFloat(String(val).replace(/,/g, '').trim());
    return isNaN(num) ? 0 : num;
}

function parseName(fullName) {
    if (!fullName) return { firstName: 'Student', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function mapPaymentMethod(mode) {
    if (!mode) return 'cash';
    const m = String(mode).trim().toUpperCase();
    if (m === 'ONLINE' || m.includes('UPI') || m.includes('NEFT') || m.includes('RTGS') || m.includes('G-PAY') || m.includes('PHONEPE')) return 'upi';
    if (m === 'CHK' || m.includes('CHEQUE')) return 'cheque';
    if (m.includes('LOAN') || m.includes('TRANSFER') || m.includes('BANK')) return 'bank_transfer';
    if (m.includes('CARD')) return 'card';
    return 'cash';
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

    const instituteCode = (get('--institute') || 'SDCDEGKOLAR').toUpperCase();
    const activeSessionName = get('--session') || '2026-27 ODD SEM';

    let feeFile = get('--file') || path.join(__dirname, 'data', '2024 BATCH FEE DETAILS.xlsx');
    if (!fs.existsSync(feeFile)) {
        feeFile = path.resolve('C:/Users/Comp/Downloads/2024 BATCH FEE DETAILS.xlsx');
    }

    let photoUrlsFile = get('--photos-json') || path.join(__dirname, 'data', 'sdc-photo-urls.json');

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — 3RD YEAR (2024 BATCH) ONBOARDING        ');
    console.log('=================================================================');
    console.log(`Institute  : ${instituteCode}`);
    console.log(`Active Sem : ${activeSessionName} (Semester 5)`);
    console.log(`Fee File   : ${feeFile}`);
    console.log(`Mode       : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
    console.log('-----------------------------------------------------------------\n');

    if (!fs.existsSync(feeFile)) {
        console.error(`❌ Fee file not found: ${feeFile}`);
        process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) { console.error('❌ MONGODB_URI not set in .env.local'); process.exit(1); }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Models
    const Institute  = mongoose.models.Institute  || (await import('../models/Institute.js')).default;
    const Session    = mongoose.models.Session    || (await import('../models/Session.js')).default;
    const Course     = mongoose.models.Course     || (await import('../models/Course.js')).default;
    const Batch      = mongoose.models.Batch      || (await import('../models/Batch.js')).default;
    const User       = mongoose.models.User       || (await import('../models/User.js')).default;
    const Fee        = mongoose.models.Fee        || (await import('../models/Fee.js')).default;
    const Membership = mongoose.models.Membership || (await import('../models/Membership.js')).default;

    // 1. Resolve Institute
    const inst = await Institute.findOne({
        $or: [
            { code: instituteCode },
            { code: 'SDCDEG' },
            { name: { $regex: /danamma/i } }
        ],
        deletedAt: null
    });
    if (!inst) {
        console.error(`❌ Institute "${instituteCode}" not found!`);
        process.exit(1);
    }
    console.log(`✅ Institute: ${inst.name} (${inst._id})\n`);

    const actor = await User.findOne({
        institute: inst._id,
        role: { $in: ['admin', 'super_admin'] }
    });
    const actorId = actor ? actor._id : new mongoose.Types.ObjectId();

    // 2. Resolve Academic Sessions
    async function getOrCreateSession(name, isActive, startDate, endDate) {
        let s = await Session.findOne({
            $or: [{ instituteId: inst._id }, { institute: inst._id }],
            sessionName: { $regex: new RegExp(`^${name.replace(/-/g, '[-_ ]')}$`, 'i') },
            deletedAt: null
        });
        if (!s) {
            console.log(`  └─ Auto-creating session: "${name}" (isActive: ${isActive})`);
            if (!isDryRun) {
                s = await Session.create({
                    instituteId: inst._id,
                    institute: inst._id,
                    sessionName: name,
                    startDate,
                    endDate,
                    isActive,
                    createdBy: actorId
                });
            } else {
                s = { _id: new mongoose.Types.ObjectId(), sessionName: name, isActive, startDate, endDate };
            }
        }
        return s;
    }

    // Sessions setup:
    // Sem 1: 2024-25 ODD SEM
    // Sem 2: 2024-25 EVEN SEM
    // Sem 3: 2025-26 ODD SEM
    // Sem 4: 2025-26 EVEN SEM
    // Sem 5: 2026-27 ODD SEM (Current Active)
    const sem1Session = await getOrCreateSession('2024-25 ODD SEM', false, new Date('2024-06-01'), new Date('2024-12-31'));
    const sem2Session = await getOrCreateSession('2024-25 EVEN SEM', false, new Date('2025-01-01'), new Date('2025-05-31'));
    const sem3Session = await getOrCreateSession('2025-26 ODD SEM', false, new Date('2025-06-01'), new Date('2025-12-31'));
    const sem4Session = await getOrCreateSession('2025-26 EVEN SEM', false, new Date('2026-01-01'), new Date('2026-05-31'));

    let sem5Session = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName: { $regex: new RegExp(activeSessionName.replace(/-/g, '[-_ ]'), 'i') },
        deletedAt: null
    });
    if (!sem5Session) {
        sem5Session = await getOrCreateSession(activeSessionName, true, new Date('2026-06-01'), new Date('2026-12-31'));
    }

    console.log(`✅ Sem 1 Session (2024-25 ODD)  : ${sem1Session.sessionName} (${sem1Session._id})`);
    console.log(`✅ Sem 2 Session (2024-25 EVEN) : ${sem2Session.sessionName} (${sem2Session._id})`);
    console.log(`✅ Sem 3 Session (2025-26 ODD)  : ${sem3Session.sessionName} (${sem3Session._id})`);
    console.log(`✅ Sem 4 Session (2025-26 EVEN) : ${sem4Session.sessionName} (${sem4Session._id})`);
    console.log(`✅ Sem 5 Session (2026-27 ODD)* : ${sem5Session.sessionName} (${sem5Session._id}) [ACTIVE]\n`);

    const allSessionIds = [sem1Session._id, sem2Session._id, sem3Session._id, sem4Session._id, sem5Session._id];

    // 3. Resolve Courses
    const courses = await Course.find({ institute: inst._id, deletedAt: null });
    const courseMap = new Map();
    for (const c of courses) {
        courseMap.set(c.code.toUpperCase(), c);
        courseMap.set(c.name.toUpperCase(), c);
    }

    // BSC Course mapping for streams: CBZ, PCM, PMCS
    const bscCourse = courses.find(c => c.code === 'BSC' || c.name.toLowerCase().includes('science'));
    if (bscCourse) {
        courseMap.set('CBZ', bscCourse);
        courseMap.set('PCM', bscCourse);
        courseMap.set('PMCS', bscCourse);
    }

    // 4. Batches Management
    const batchMap = new Map(); // `${session._id}_${courseId}_${sectionName}_${semester}` -> batch

    const existingBatches = await Batch.find({ institute: inst._id, deletedAt: null });
    for (const b of existingBatches) {
        const key = `${b.session?.toString()}_${b.course?.toString()}_${b.name.toUpperCase()}_${b.semester}`;
        batchMap.set(key, b);
    }

    async function getOrCreateBatch(targetSession, targetCourse, sectionName, semester) {
        const key = `${targetSession._id.toString()}_${targetCourse._id.toString()}_${sectionName.toUpperCase()}_${semester}`;
        if (batchMap.has(key)) return batchMap.get(key);

        console.log(`  └─ Auto-creating batch: "${sectionName}" under ${targetCourse.name} (Sem ${semester}, ${targetSession.sessionName})`);
        let batch;
        if (!isDryRun) {
            batch = await Batch.create({
                institute: inst._id,
                course: targetCourse._id,
                session: targetSession._id,
                name: sectionName,
                semester,
                capacity: 250,
                schedule: {
                    startDate: targetSession.startDate || new Date(),
                    endDate: targetSession.endDate || new Date()
                },
                createdBy: actorId,
                enrolledStudents: []
            });
        } else {
            batch = { _id: new mongoose.Types.ObjectId(), name: sectionName, course: targetCourse._id, session: targetSession._id, semester, enrolledStudents: [] };
        }
        batchMap.set(key, batch);
        return batch;
    }

    // Photo URLs map
    const photoUrlMap = new Map();
    if (fs.existsSync(photoUrlsFile)) {
        try {
            const photoJson = JSON.parse(fs.readFileSync(photoUrlsFile, 'utf8'));
            for (const [k, v] of Object.entries(photoJson)) {
                photoUrlMap.set(k.toUpperCase(), v);
            }
            console.log(`Loaded ${photoUrlMap.size} photo CDN URLs from ${photoUrlsFile}.\n`);
        } catch (e) {
            console.warn('⚠️  Could not read photo URLs file:', e.message);
        }
    }

    // =========================================================================
    // READ EXCEL
    // =========================================================================
    console.log('--- Reading 2024 Master Ledger (FEE Sheet) ---');
    const wb = XLSX.readFile(feeFile);
    const feeSheet = wb.Sheets['FEE'];
    if (!feeSheet) {
        console.error('❌ Sheet "FEE" not found in excel workbook!');
        process.exit(1);
    }
    const dRows = XLSX.utils.sheet_to_json(feeSheet, { header: 1 });
    console.log(`Loaded ${dRows.length - 3} raw rows from FEE sheet.\n`);

    const defaultStudentHash = await bcrypt.hash('Student@123', 10);

    const stats = {
        totalRows: dRows.length - 3,
        processed: 0,
        skipped: 0,
        created: 0,
        existing: 0,
        enrolledSem5: 0,
        sem1Fees: { count: 0, gross: 0, paid: 0, bal: 0 },
        sem2Fees: { count: 0, gross: 0, paid: 0, bal: 0 },
        sem3Fees: { count: 0, gross: 0, paid: 0, bal: 0 },
        sem4Fees: { count: 0, gross: 0, paid: 0, bal: 0 },
        sem5Fees: { count: 0, gross: 0, paid: 0, bal: 0 },
        errors: []
    };

    console.log('--- Ingesting 3rd Year Students, Batches & Multi-Session Fees ---');

    // Data starts at row index 3 (Row 4 in Excel)
    for (let i = 3; i < dRows.length; i++) {
        const r = dRows[i];
        const rowNum = i + 1;

        if (!r || !r[9]) {
            stats.skipped++;
            continue;
        }

        const studentId = String(r[9]).trim(); // SDC2024xxx
        const regNo = String(r[8] || '').trim(); // U19ZE24C0176
        const rawCourse = String(r[3] || '').trim().toUpperCase(); // BCOM, BCA, BBA, CBZ, PCM, PMCS
        const rawSec = String(r[7] || 'A').trim().toUpperCase();
        const studentName = String(r[10] || '').trim();
        const fatherName = String(r[11] || '').trim();
        const contact1 = String(r[5] || '').replace(/\D/g, '').slice(-10);
        const contact2 = String(r[6] || '').replace(/\D/g, '').slice(-10);
        const admissionDate = normalizeDate(r[1]) || new Date('2024-06-01');

        if (!studentName || !studentId) {
            stats.skipped++;
            continue;
        }

        try {
            stats.processed++;

            // 1. Resolve Target Course
            const targetCourse = courseMap.get(rawCourse);
            if (!targetCourse) {
                stats.errors.push(`Row ${rowNum}: Unknown course "${rawCourse}" for ${studentName} (${studentId})`);
                continue;
            }

            // 2. Resolve Section Name
            let sectionName = rawSec || 'A';
            if (['CBZ', 'PCM', 'PMCS'].includes(rawCourse)) {
                sectionName = rawSec ? `${rawCourse} - ${rawSec}` : rawCourse;
            }

            // Batches across all 5 semesters
            const sem1Batch = await getOrCreateBatch(sem1Session, targetCourse, sectionName, 1);
            const sem2Batch = await getOrCreateBatch(sem2Session, targetCourse, sectionName, 2);
            const sem3Batch = await getOrCreateBatch(sem3Session, targetCourse, sectionName, 3);
            const sem4Batch = await getOrCreateBatch(sem4Session, targetCourse, sectionName, 4);
            const sem5Batch = await getOrCreateBatch(sem5Session, targetCourse, sectionName, 5);

            // 3. User Details
            const { firstName, lastName } = parseName(studentName);
            const safeId = studentId.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            const email = `${safeId}@sdcdeg.edu.in`;
            const avatarUrl = photoUrlMap.get(studentId.toUpperCase()) || (regNo ? photoUrlMap.get(regNo.toUpperCase()) : undefined);

            let student = await User.findOne({ institute: inst._id, enrollmentNumber: studentId, deletedAt: null })
                       || await User.findOne({ email, deletedAt: null });

            if (!student) {
                if (isDryRun) {
                    student = { _id: new mongoose.Types.ObjectId(), enrollmentNumber: studentId, email };
                    stats.created++;
                } else {
                    const userDoc = {
                        institute: inst._id,
                        role: 'student',
                        email,
                        passwordHash: defaultStudentHash,
                        enrollmentNumber: studentId,
                        grNumber: regNo || undefined,
                        profile: {
                            firstName: firstName || 'Student',
                            lastName: lastName || '',
                            studentId: studentId,
                            registrationNumber: regNo || undefined,
                            admissionNumber: studentId,
                            gender: 'Not Specified',
                            ...(contact2 && { phone: contact2 }),
                            ...(!contact2 && contact1 && { phone: contact1 }),
                            ...(avatarUrl && { avatar: avatarUrl })
                        },
                        ...(contact1 && { fatherPhone: contact1 }),
                        ...(fatherName && { fatherName }),
                        ...(admissionDate && { admissionDate }),
                        admissionStd: targetCourse.name,
                        activeSession: sem5Session._id,
                        activeSessions: allSessionIds
                    };

                    try {
                        student = await User.create(userDoc);
                    } catch (e) {
                        if (e.code === 11000) {
                            userDoc.email = `${safeId}${rowNum}@sdcdeg.edu.in`;
                            student = await User.create(userDoc);
                        } else throw e;
                    }

                    await Membership.findOneAndUpdate(
                        { user: student._id, institute: inst._id },
                        { $setOnInsert: { user: student._id, institute: inst._id, role: 'student', isActive: true } },
                        { upsert: true }
                    );
                    stats.created++;
                }
            } else {
                stats.existing++;
                if (!isDryRun) {
                    const updateFields = {
                        activeSession: sem5Session._id
                    };
                    if (avatarUrl && !student.profile?.avatar) {
                        updateFields['profile.avatar'] = avatarUrl;
                    }
                    if (regNo && !student.profile?.registrationNumber) {
                        updateFields['profile.registrationNumber'] = regNo;
                        updateFields.grNumber = regNo;
                    }
                    await User.updateOne(
                        { _id: student._id },
                        {
                            $set: updateFields,
                            $addToSet: { activeSessions: { $each: allSessionIds } }
                        }
                    );
                }
            }

            // 4. Enroll in Batches (Sem 1-4 completed, Sem 5 active)
            if (!isDryRun) {
                await Batch.updateOne(
                    { _id: sem1Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date('2024-06-01'), status: 'completed' } } }
                );
                await Batch.updateOne(
                    { _id: sem2Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: new Date('2025-01-01'), status: 'completed' } } }
                );
                await Batch.updateOne(
                    { _id: sem3Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: new Date('2025-06-01'), status: 'completed' } } }
                );
                await Batch.updateOne(
                    { _id: sem4Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: new Date('2026-01-01'), status: 'completed' } } }
                );
                await Batch.updateOne(
                    { _id: sem5Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date(), status: 'active' } } }
                );
            }
            stats.enrolledSem5++;

            // =================================================================
            // 5. FEE RECORDS (SEM 1, SEM 2, SEM 3, SEM 4, SEM 5)
            // =================================================================

            function parseInstallmentTriplets(row, tripletIndices, semLabel, defaultDate) {
                const insts = [];
                let instCount = 1;
                for (const idx of tripletIndices) {
                    const dCol = idx[0];
                    const mCol = idx[1];
                    const aCol = idx[2];

                    const amt = normalizeNumber(row[aCol]);
                    if (amt > 0) {
                        const dVal = normalizeDate(row[dCol]) || defaultDate;
                        const modeStr = String(row[mCol] || 'CASH').trim();
                        insts.push({
                            _id: new mongoose.Types.ObjectId(),
                            amount: amt,
                            dueDate: dVal,
                            paidDate: dVal,
                            status: 'paid',
                            paymentMethod: mapPaymentMethod(modeStr),
                            notes: `${semLabel} — Installment #${instCount} (${modeStr})`
                        });
                        instCount++;
                    }
                }
                return insts;
            }

            async function upsertFeeRecord({ semNumber, sessionDoc, batchDoc, totalCol, paidCol, balCol, tripletIndices, defaultDate }) {
                const totFee = normalizeNumber(r[totalCol]);
                const totPaid = normalizeNumber(r[paidCol]);
                const rawBal = normalizeNumber(r[balCol]);

                if (totFee <= 0 && totPaid <= 0) return null;

                const installments = parseInstallmentTriplets(r, tripletIndices, `Semester ${semNumber}`, defaultDate);
                const sumPaid = installments.reduce((acc, x) => acc + x.amount, 0);

                // Effective total & balance (guard against negative balance/installments)
                const effectiveTotal = Math.max(totFee, sumPaid, totPaid);
                const effectiveBalance = Math.max(0, effectiveTotal - sumPaid);

                if (effectiveBalance > 0) {
                    const dueDate = semNumber === 5 ? new Date('2026-12-31') : defaultDate;
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: effectiveBalance,
                        dueDate,
                        status: semNumber === 5 ? 'pending' : 'overdue',
                        notes: `Semester ${semNumber} pending balance due`
                    });
                }

                const feeStatus = effectiveBalance === 0 ? 'paid' : (sumPaid > 0 ? 'partial' : 'not_started');

                if (!isDryRun) {
                    const existing = await Fee.findOne({
                        institute: inst._id,
                        student: student._id,
                        batch: batchDoc._id,
                        deletedAt: null
                    });

                    if (!existing) {
                        await Fee.create({
                            institute: inst._id,
                            session: sessionDoc._id,
                            student: student._id,
                            batch: batchDoc._id,
                            totalAmount: effectiveTotal,
                            discount: { amount: 0 },
                            extraCharges: { amount: 0 },
                            paidAmount: sumPaid,
                            balanceAmount: effectiveBalance,
                            status: feeStatus,
                            installments,
                            createdBy: actorId
                        });
                    }
                }

                return { total: effectiveTotal, paid: sumPaid, bal: effectiveBalance };
            }

            // --- SEMESTER 1 ---
            // Triplet columns: [139,140,141], [142,143,144], [145,146,147], [148,149,150], [151,152,153], [154,155,156], [157,158,159], [160,161,162]
            const sem1Triplets = [
                [139, 140, 141], [142, 143, 144], [145, 146, 147], [148, 149, 150],
                [151, 152, 153], [154, 155, 156], [157, 158, 159], [160, 161, 162]
            ];
            const sem1Res = await upsertFeeRecord({
                semNumber: 1,
                sessionDoc: sem1Session,
                batchDoc: sem1Batch,
                totalCol: 136,
                paidCol: 137,
                balCol: 138,
                tripletIndices: sem1Triplets,
                defaultDate: new Date('2024-07-15')
            });
            if (sem1Res) {
                stats.sem1Fees.count++;
                stats.sem1Fees.gross += sem1Res.total;
                stats.sem1Fees.paid += sem1Res.paid;
                stats.sem1Fees.bal += sem1Res.bal;
            }

            // --- SEMESTER 2 ---
            // Triplet columns: [113,114,115], [116,117,118], [119,120,121], [122,123,124], [125,126,127], [128,129,130]
            const sem2Triplets = [
                [113, 114, 115], [116, 117, 118], [119, 120, 121], [122, 123, 124], [125, 126, 127], [128, 129, 130]
            ];
            const sem2Res = await upsertFeeRecord({
                semNumber: 2,
                sessionDoc: sem2Session,
                batchDoc: sem2Batch,
                totalCol: 110,
                paidCol: 111,
                balCol: 112,
                tripletIndices: sem2Triplets,
                defaultDate: new Date('2025-01-18')
            });
            if (sem2Res) {
                stats.sem2Fees.count++;
                stats.sem2Fees.gross += sem2Res.total;
                stats.sem2Fees.paid += sem2Res.paid;
                stats.sem2Fees.bal += sem2Res.bal;
            }

            // --- SEMESTER 3 ---
            // Triplet columns: [83,84,85], [86,87,88], [89,90,91], [92,93,94], [95,96,97], [98,99,100]
            const sem3Triplets = [
                [83, 84, 85], [86, 87, 88], [89, 90, 91], [92, 93, 94], [95, 96, 97], [98, 99, 100]
            ];
            const sem3Res = await upsertFeeRecord({
                semNumber: 3,
                sessionDoc: sem3Session,
                batchDoc: sem3Batch,
                totalCol: 80,
                paidCol: 81,
                balCol: 82,
                tripletIndices: sem3Triplets,
                defaultDate: new Date('2025-07-15')
            });
            if (sem3Res) {
                stats.sem3Fees.count++;
                stats.sem3Fees.gross += sem3Res.total;
                stats.sem3Fees.paid += sem3Res.paid;
                stats.sem3Fees.bal += sem3Res.bal;
            }

            // --- SEMESTER 4 ---
            // Triplet columns: [52,53,54], [55,56,57], [58,59,60], [61,62,63], [64,65,66], [67,68,69]
            const sem4Triplets = [
                [52, 53, 54], [55, 56, 57], [58, 59, 60], [61, 62, 63], [64, 65, 66], [67, 68, 69]
            ];
            const sem4Res = await upsertFeeRecord({
                semNumber: 4,
                sessionDoc: sem4Session,
                batchDoc: sem4Batch,
                totalCol: 49,
                paidCol: 50,
                balCol: 51,
                tripletIndices: sem4Triplets,
                defaultDate: new Date('2026-01-17')
            });
            if (sem4Res) {
                stats.sem4Fees.count++;
                stats.sem4Fees.gross += sem4Res.total;
                stats.sem4Fees.paid += sem4Res.paid;
                stats.sem4Fees.bal += sem4Res.bal;
            }

            // --- SEMESTER 5 (CURRENT ACTIVE) ---
            // Triplet columns: [21,22,23], [24,25,26], [27,28,29], [30,31,32], [33,34,35], [36,37,38]
            const sem5Triplets = [
                [21, 22, 23], [24, 25, 26], [27, 28, 29], [30, 31, 32], [33, 34, 35], [36, 37, 38]
            ];
            const sem5Res = await upsertFeeRecord({
                semNumber: 5,
                sessionDoc: sem5Session,
                batchDoc: sem5Batch,
                totalCol: 18,
                paidCol: 19,
                balCol: 20,
                tripletIndices: sem5Triplets,
                defaultDate: new Date('2026-07-23')
            });
            if (sem5Res) {
                stats.sem5Fees.count++;
                stats.sem5Fees.gross += sem5Res.total;
                stats.sem5Fees.paid += sem5Res.paid;
                stats.sem5Fees.bal += sem5Res.bal;
            }

        } catch (err) {
            stats.errors.push(`Row ${rowNum} (${studentId}): ${err.message}`);
        }
    }

    console.log('\n=================================================================');
    console.log('                      SUMMARY REPORT                             ');
    console.log('=================================================================');
    console.log(`Mode                   : ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE'}`);
    console.log(`Total Rows             : ${stats.totalRows}`);
    console.log(`Processed              : ${stats.processed}`);
    console.log(`Skipped                : ${stats.skipped}`);
    console.log(`Students to Create     : ${stats.created}`);
    console.log(`Students Existing      : ${stats.existing}`);
    console.log(`Sem 5 Enrollments      : ${stats.enrolledSem5}`);
    console.log('-----------------------------------------------------------------');
    console.log(`Sem 1 Records          : ${stats.sem1Fees.count} | Gross: ₹${stats.sem1Fees.gross.toLocaleString('en-IN')} | Paid: ₹${stats.sem1Fees.paid.toLocaleString('en-IN')} | Bal: ₹${stats.sem1Fees.bal.toLocaleString('en-IN')}`);
    console.log(`Sem 2 Records          : ${stats.sem2Fees.count} | Gross: ₹${stats.sem2Fees.gross.toLocaleString('en-IN')} | Paid: ₹${stats.sem2Fees.paid.toLocaleString('en-IN')} | Bal: ₹${stats.sem2Fees.bal.toLocaleString('en-IN')}`);
    console.log(`Sem 3 Records          : ${stats.sem3Fees.count} | Gross: ₹${stats.sem3Fees.gross.toLocaleString('en-IN')} | Paid: ₹${stats.sem3Fees.paid.toLocaleString('en-IN')} | Bal: ₹${stats.sem3Fees.bal.toLocaleString('en-IN')}`);
    console.log(`Sem 4 Records          : ${stats.sem4Fees.count} | Gross: ₹${stats.sem4Fees.gross.toLocaleString('en-IN')} | Paid: ₹${stats.sem4Fees.paid.toLocaleString('en-IN')} | Bal: ₹${stats.sem4Fees.bal.toLocaleString('en-IN')}`);
    console.log(`Sem 5 Records (ACTIVE) : ${stats.sem5Fees.count} | Gross: ₹${stats.sem5Fees.gross.toLocaleString('en-IN')} | Paid: ₹${stats.sem5Fees.paid.toLocaleString('en-IN')} | Bal: ₹${stats.sem5Fees.bal.toLocaleString('en-IN')}`);
    const totalRecords = stats.sem1Fees.count + stats.sem2Fees.count + stats.sem3Fees.count + stats.sem4Fees.count + stats.sem5Fees.count;
    const totalGross = stats.sem1Fees.gross + stats.sem2Fees.gross + stats.sem3Fees.gross + stats.sem4Fees.gross + stats.sem5Fees.gross;
    const totalPaid = stats.sem1Fees.paid + stats.sem2Fees.paid + stats.sem3Fees.paid + stats.sem4Fees.paid + stats.sem5Fees.paid;
    const totalBal = stats.sem1Fees.bal + stats.sem2Fees.bal + stats.sem3Fees.bal + stats.sem4Fees.bal + stats.sem5Fees.bal;
    console.log('-----------------------------------------------------------------');
    console.log(`Total Fee Records      : ${totalRecords}`);
    console.log(`Lifetime Cumulative    : Gross: ₹${totalGross.toLocaleString('en-IN')} | Paid: ₹${totalPaid.toLocaleString('en-IN')} | Bal: ₹${totalBal.toLocaleString('en-IN')}`);
    console.log(`Errors                 : ${stats.errors.length}`);

    if (stats.errors.length > 0) {
        console.log('\nErrors:');
        stats.errors.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`));
        if (stats.errors.length > 20) console.log(`  ... and ${stats.errors.length - 20} more errors`);
    }
    console.log('=================================================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
}

run().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
