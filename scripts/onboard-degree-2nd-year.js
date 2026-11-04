/**
 * Smt. Danamma Channabasavaiah Degree College (SDCDEGKOLAR)
 * 2nd Year (2025 Batch) — Multi-Session Student, Batch & Fee Onboarding Script
 *
 * Reads:
 *   - scripts/data/2025 BATCH FEE DETAILS.xlsx
 *
 * Automatically creates:
 *   - Past Sessions: "2025-26 ODD SEM" & "2025-26 EVEN SEM" (isActive: false)
 *   - Current Session: "2026-27 ODD SEM" (isActive: true)
 *   - Semester 3 Batches in Current Session:
 *       - BCOM -> Section A
 *       - BCA  -> Section A
 *       - BBA  -> Section A
 *       - BSC  -> Section CBZ, Section PCM, Section PMCS
 *   - Ingests 508 students, enrolled in Semester 3
 *   - Creates 3 unified Fee ledgers per student:
 *       1. Semester 1 Fee (2025-26 ODD SEM) with all past installments
 *       2. Semester 2 Fee (2025-26 EVEN SEM) with all past installments
 *       3. Semester 3 Fee (2026-27 ODD SEM - Current) with current payments & live dues
 *
 * Usage:
 *   node scripts/onboard-degree-2nd-year.js --dry-run
 *   node scripts/onboard-degree-2nd-year.js
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
    if (m === 'ONLINE' || m.includes('UPI') || m.includes('NEFT') || m.includes('RTGS')) return 'upi';
    if (m === 'CHK' || m.includes('CHEQUE')) return 'cheque';
    if (m.includes('LOAN') || m.includes('TRANSFER')) return 'bank_transfer';
    if (m.includes('CARD')) return 'card';
    return 'cash';
}

function normalizeBloodGroup(val) {
    if (!val) return undefined;
    const clean = String(val).trim().toUpperCase();
    const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return valid.includes(clean) ? clean : undefined;
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

    let feeFile = get('--file') || path.join(__dirname, 'data', '2025 BATCH FEE DETAILS.xlsx');
    if (!fs.existsSync(feeFile)) {
        feeFile = path.resolve('C:/Users/Comp/Downloads/2025 BATCH FEE DETAILS.xlsx');
    }

    let photoUrlsFile = get('--photos-json') || path.join(__dirname, 'data', 'sdc-photo-urls.json');

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — 2ND YEAR (2025 BATCH) ONBOARDING        ');
    console.log('=================================================================');
    console.log(`Institute  : ${instituteCode}`);
    console.log(`Active Sem : ${activeSessionName} (Semester 3)`);
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
    console.log(`✅ Institute : ${inst.name} (${inst.code}) [ID: ${inst._id}]`);

    // Auto-expand student quota if needed
    const currentMax = inst.limits?.maxStudents || 0;
    if (currentMax < 2500) {
        if (!isDryRun) {
            await Institute.updateOne({ _id: inst._id }, { $set: { 'limits.maxStudents': 2500 } });
            console.log(`  ℹ️  Upgraded student quota: ${currentMax} -> 2500 allotted`);
        } else {
            console.log(`  ℹ️  [DRY-RUN] Would upgrade quota: ${currentMax} -> 2500 allotted`);
        }
    }

    // Resolve admin actor
    const adminUser = await User.findOne({
        $or: [
            { institute: inst._id, role: { $in: ['admin', 'super_admin'] } },
            { role: 'super_admin' }
        ],
        deletedAt: null
    });
    const actorId = adminUser?._id || new mongoose.Types.ObjectId();

    // 2. Resolve or Create Academic Sessions
    async function getOrCreateSession(name, isActive, startDate, endDate) {
        let s = await Session.findOne({
            $or: [{ instituteId: inst._id }, { institute: inst._id }],
            sessionName: { $regex: new RegExp(name.replace(/-/g, '[-_ ]'), 'i') },
            deletedAt: null
        });

        if (!s) {
            console.log(`  └─ Creating session: "${name}" (isActive: ${isActive})`);
            if (!isDryRun) {
                s = await Session.create({
                    sessionName: name,
                    instituteId: inst._id,
                    startDate,
                    endDate,
                    isActive
                });
            } else {
                s = { _id: new mongoose.Types.ObjectId(), sessionName: name, isActive, startDate, endDate };
            }
        }
        return s;
    }

    // Current Session (Semester 3)
    let currentSession = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName: { $regex: new RegExp(activeSessionName.replace(/-/g, '[-_ ]'), 'i') },
        deletedAt: null
    });
    if (!currentSession) {
        currentSession = await getOrCreateSession(activeSessionName, true, new Date('2026-06-01'), new Date('2026-12-31'));
    }
    console.log(`✅ Current Session (Sem 3) : ${currentSession.sessionName} (${currentSession._id})`);

    // Past Sessions (Sem 1 and Sem 2)
    const sem1Session = await getOrCreateSession('2025-26 ODD SEM', false, new Date('2025-06-01'), new Date('2025-12-31'));
    const sem2Session = await getOrCreateSession('2025-26 EVEN SEM', false, new Date('2026-01-01'), new Date('2026-05-31'));
    console.log(`✅ Past Session (Sem 1)    : ${sem1Session.sessionName} (${sem1Session._id})`);
    console.log(`✅ Past Session (Sem 2)    : ${sem2Session.sessionName} (${sem2Session._id})\n`);

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
    console.log('--- Reading 2025 Master Ledger ---');
    const wb = XLSX.readFile(feeFile);
    const dRows = XLSX.utils.sheet_to_json(wb.Sheets['DATA'], { header: 1 });
    console.log(`Loaded ${dRows.length - 2} student rows from DATA sheet.\n`);

    const defaultStudentHash = await bcrypt.hash('Student@123', 10);

    const stats = {
        total: dRows.length - 2,
        processed: 0,
        skipped: 0,
        created: 0,
        existing: 0,
        enrolledSem3: 0,
        feesSem1: 0,
        feesSem2: 0,
        feesSem3: 0,
        errors: []
    };

    console.log('--- Ingesting 2nd Year Students & Fees ---');

    for (let i = 2; i < dRows.length; i++) {
        const r = dRows[i];
        const rowNum = i + 1;

        if (!r || !r[8]) {
            stats.skipped++;
            continue;
        }

        const studentId = String(r[8]).trim(); // SDC2025567
        const regNo = String(r[7] || '').trim(); // U19ZE25S0291
        const rawCourse = String(r[2] || '').trim().toUpperCase(); // BCA, BCOM, BBA, CBZ, PCM, PMCS
        const studentName = String(r[9] || '').trim();
        const parentPhone = String(r[5] || '').replace(/\D/g, '').slice(-10);
        const studentPhone = String(r[6] || '').replace(/\D/g, '').slice(-10);
        const admissionDate = normalizeDate(r[1]) || new Date('2025-06-01');

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
            // For BSC: use the stream name (CBZ, PCM, PMCS)
            // For BCOM, BCA, BBA: use Section "A"
            let sectionName = 'A';
            if (['CBZ', 'PCM', 'PMCS'].includes(rawCourse)) {
                sectionName = rawCourse;
            }

            // Batches across 3 semesters
            const sem1Batch = await getOrCreateBatch(sem1Session, targetCourse, sectionName, 1);
            const sem2Batch = await getOrCreateBatch(sem2Session, targetCourse, sectionName, 2);
            const sem3Batch = await getOrCreateBatch(currentSession, targetCourse, sectionName, 3);

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
                            gender: 'Not Specified',
                            ...(studentPhone && { phone: studentPhone }),
                            ...(avatarUrl && { avatar: avatarUrl })
                        },
                        ...(parentPhone && { fatherPhone: parentPhone }),
                        ...(admissionDate && { admissionDate }),
                        admissionStd: targetCourse.name,
                        activeSession: currentSession._id,
                        activeSessions: [currentSession._id]
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
                if (!isDryRun && avatarUrl && !student.profile?.avatar) {
                    await User.updateOne({ _id: student._id }, { $set: { 'profile.avatar': avatarUrl } });
                }
            }

            // 4. Enroll in Active Batch (Semester 3)
            if (!isDryRun) {
                await Batch.updateOne(
                    { _id: sem3Batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date(), status: 'active' } } }
                );
            }
            stats.enrolledSem3++;

            // =================================================================
            // 5. FEE RECORDS (SEM 1, SEM 2, SEM 3)
            // =================================================================

            // Helper to parse installment triplets
            function parseInstallments(row, startCol, endCol, semLabel, defaultDate) {
                const insts = [];
                let instCount = 1;
                for (let k = startCol; k < endCol; k += 3) {
                    const amt = normalizeNumber(row[k + 2]);
                    if (amt > 0) {
                        const dVal = normalizeDate(row[k]) || defaultDate;
                        const modeStr = String(row[k + 1] || 'CASH').trim();
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

            // -----------------------------------------------------------------
            // SEMESTER 1 FEE
            // -----------------------------------------------------------------
            const s1Total = normalizeNumber(r[70]);
            const s1Paid = normalizeNumber(r[71]);
            const s1Due = Math.max(0, normalizeNumber(r[72]));
            const s1Fix = normalizeNumber(r[66]);
            const s1Mgmt = normalizeNumber(r[67]);
            const s1Mscp = normalizeNumber(r[69]);

            if (s1Total > 0) {
                const s1Installments = parseInstallments(r, 73, 91, 'Semester 1 Fee', sem1Session.startDate || new Date('2025-06-01'));
                if (s1Due > 0) {
                    s1Installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: s1Due,
                        dueDate: sem1Session.endDate || new Date('2025-12-31'),
                        status: 'pending',
                        notes: 'Remaining Semester 1 balance'
                    });
                }
                const sum1 = s1Installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(sum1 - s1Total) > 0.01 && s1Installments.length > 0) {
                    s1Installments[s1Installments.length - 1].amount += (s1Total - sum1);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({ institute: inst._id, student: student._id, batch: sem1Batch._id, deletedAt: null });
                    if (!exists) {
                        const comps = [{ name: 'Tuition Fee', amount: s1Fix || s1Total }];
                        if (s1Mgmt > 0) comps.push({ name: 'Management Fee', amount: s1Mgmt });
                        if (s1Mscp > 0) comps.push({ name: 'MSCP', amount: s1Mscp });

                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: sem1Batch._id,
                            session: sem1Session._id,
                            totalAmount: s1Total,
                            paidAmount: s1Paid,
                            balanceAmount: s1Due,
                            status: s1Due <= 0 ? 'paid' : (s1Paid > 0 ? 'partial' : 'not_started'),
                            components: comps,
                            installments: s1Installments
                        });
                        stats.feesSem1++;
                    }
                } else {
                    stats.feesSem1++;
                }
            }

            // -----------------------------------------------------------------
            // SEMESTER 2 FEE
            // -----------------------------------------------------------------
            const s2Total = normalizeNumber(r[42]);
            const s2Paid = normalizeNumber(r[43]);
            const s2Due = Math.max(0, normalizeNumber(r[44]));
            const s2Fix = normalizeNumber(r[40]);

            if (s2Total > 0) {
                const s2Installments = parseInstallments(r, 45, 63, 'Semester 2 Fee', sem2Session.startDate || new Date('2026-01-01'));
                if (s2Due > 0) {
                    s2Installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: s2Due,
                        dueDate: sem2Session.endDate || new Date('2026-05-31'),
                        status: 'pending',
                        notes: 'Remaining Semester 2 balance'
                    });
                }
                const sum2 = s2Installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(sum2 - s2Total) > 0.01 && s2Installments.length > 0) {
                    s2Installments[s2Installments.length - 1].amount += (s2Total - sum2);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({ institute: inst._id, student: student._id, batch: sem2Batch._id, deletedAt: null });
                    if (!exists) {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: sem2Batch._id,
                            session: sem2Session._id,
                            totalAmount: s2Total,
                            paidAmount: s2Paid,
                            balanceAmount: s2Due,
                            status: s2Due <= 0 ? 'paid' : (s2Paid > 0 ? 'partial' : 'not_started'),
                            components: [{ name: 'Semester 2 Tuition Fee', amount: s2Fix || s2Total }],
                            installments: s2Installments
                        });
                        stats.feesSem2++;
                    }
                } else {
                    stats.feesSem2++;
                }
            }

            // -----------------------------------------------------------------
            // SEMESTER 3 FEE (CURRENT ACTIVE SESSION)
            // -----------------------------------------------------------------
            const s3Total = normalizeNumber(r[15]);
            const s3Paid = normalizeNumber(r[16]);
            const s3Due = Math.max(0, normalizeNumber(r[17]));
            const s3Fix = normalizeNumber(r[13]);

            if (s3Total > 0) {
                const s3Installments = parseInstallments(r, 18, 36, 'Semester 3 Fee', currentSession.startDate || new Date('2026-06-01'));
                if (s3Due > 0) {
                    s3Installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: s3Due,
                        dueDate: currentSession.endDate || new Date('2026-12-31'),
                        status: 'pending',
                        notes: 'Remaining Semester 3 balance'
                    });
                }
                const sum3 = s3Installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(sum3 - s3Total) > 0.01 && s3Installments.length > 0) {
                    s3Installments[s3Installments.length - 1].amount += (s3Total - sum3);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({ institute: inst._id, student: student._id, batch: sem3Batch._id, deletedAt: null });
                    if (!exists) {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: sem3Batch._id,
                            session: currentSession._id,
                            totalAmount: s3Total,
                            paidAmount: s3Paid,
                            balanceAmount: s3Due,
                            status: s3Due <= 0 ? 'paid' : (s3Paid > 0 ? 'partial' : 'not_started'),
                            components: [{ name: 'Semester 3 Tuition Fee', amount: s3Fix || s3Total }],
                            installments: s3Installments
                        });
                        stats.feesSem3++;
                    }
                } else {
                    stats.feesSem3++;
                }
            }

        } catch (err) {
            stats.errors.push(`Row ${rowNum} (${studentId}): ${err.message}`);
            console.error(`  ❌ Row ${rowNum} (${studentId}): ${err.message}`);
        }
    }

    // =========================================================================
    // SUMMARY REPORT
    // =========================================================================
    console.log('\n=================================================================');
    console.log('                      SUMMARY REPORT                            ');
    console.log('=================================================================');
    console.log(`Mode                   : ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`Total Rows             : ${stats.total}`);
    console.log(`Processed              : ${stats.processed}`);
    console.log(`Skipped                : ${stats.skipped}`);
    console.log(`Students Created       : ${stats.created}`);
    console.log(`Students Existing      : ${stats.existing}`);
    console.log(`Sem 3 Enrollments      : ${stats.enrolledSem3}`);
    console.log(`Sem 1 Fee Records      : ${stats.feesSem1}`);
    console.log(`Sem 2 Fee Records      : ${stats.feesSem2}`);
    console.log(`Sem 3 Fee Records      : ${stats.feesSem3}`);
    console.log(`Total Fee Records      : ${stats.feesSem1 + stats.feesSem2 + stats.feesSem3}`);
    console.log(`Errors                 : ${stats.errors.length}`);
    if (stats.errors.length) {
        console.log('\nErrors:');
        stats.errors.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`));
        if (stats.errors.length > 20) console.log(`  ... and ${stats.errors.length - 20} more`);
    }
    console.log('=================================================================');
    if (!isDryRun && stats.created > 0) {
        console.log('\n✅ Sample student credentials:');
        console.log(`   Email    : sdc2025567@sdcdeg.edu.in`);
        console.log(`   Password : Student@123`);
    }
    console.log('');

    await mongoose.disconnect();
    process.exit(stats.errors.length > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
