/**
 * Smt. Danamma Channabasavaiah Degree College (SDCDEGKOLAR)
 * 1st Year (2026 Batch) — Student, Batch & Fee Onboarding Script
 *
 * Reads:
 *   - 2026 BATCH ADMISSION FEE DETAILS.xlsx
 *   - 2026 BATCH SEM FEE DETAILS.xlsx
 *
 * Auto-creates 1st Year Sem 1 batches:
 *   - BCOM: A, B, C, D
 *   - BCA:  A, B, C, D
 *   - BBA:  A, B
 *   - BSC:  CBZ - A, PMCS - B
 *
 * Usage:
 *   node scripts/onboard-degree-college.js --dry-run
 *   node scripts/onboard-degree-college.js
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

function normalizeBloodGroup(val) {
    if (!val) return undefined;
    const clean = String(val).trim().toUpperCase();
    const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return valid.includes(clean) ? clean : undefined;
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

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

    const instituteCode = (get('--institute') || 'SDCDEGKOLAR').toUpperCase();
    const sessionName = get('--session') || '2026-27 ODD SEM';

    // File paths
    let admFile = get('--adm-file') || path.join(__dirname, 'data', '2026 BATCH ADMISSION FEE DETAILS.xlsx');
    let semFile = get('--sem-file') || path.join(__dirname, 'data', '2026 BATCH SEM FEE DETAILS.xlsx');
    let profileFile = get('--profile-file') || path.join(__dirname, 'data', 'SDC Kolar Data Collection (GSheet).xlsx');
    let photoUrlsFile = get('--photos-json') || path.join(__dirname, 'data', 'sdc-photo-urls.json');

    if (!fs.existsSync(admFile)) {
        admFile = path.resolve('C:/Users/Comp/Downloads/2026 BATCH ADMISSION FEE DETAILS.xlsx');
    }
    if (!fs.existsSync(semFile)) {
        semFile = path.resolve('C:/Users/Comp/Downloads/2026 BATCH SEM FEE DETAILS.xlsx');
    }
    if (!fs.existsSync(profileFile)) {
        profileFile = path.resolve('E:/Users/SN01-01-15/Desktop/Schools/SDC/SDC Degree Kolar/SDC Kolar Data Collection (GSheet).xlsx');
    }

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — 1ST YEAR (2026 BATCH) ONBOARDING        ');
    console.log('=================================================================');
    console.log(`Institute  : ${instituteCode}`);
    console.log(`Session    : ${sessionName}`);
    console.log(`Mode       : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
    console.log(`Adm File   : ${admFile}`);
    console.log(`Sem File   : ${semFile}`);
    console.log(`Profile Doc: ${fs.existsSync(profileFile) ? profileFile : 'None (skipped)'}`);
    console.log(`Photo URLs : ${fs.existsSync(photoUrlsFile) ? photoUrlsFile : 'None (skipped)'}`);
    console.log('-----------------------------------------------------------------\n');

    if (!fs.existsSync(admFile) || !fs.existsSync(semFile)) {
        console.error('❌ Required Excel files not found. Ensure both files exist.');
        process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) { console.error('❌ MONGODB_URI not set in .env.local'); process.exit(1); }

    if (!isDryRun && mongoUri.includes('localhost')) {
        console.warn('⚠️  MONGODB_URI points to localhost — is this really production?');
        console.warn('   Ctrl+C within 5s to cancel...\n');
        await new Promise(r => setTimeout(r, 5000));
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Load models
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
        console.error(`❌ Institute "${instituteCode}" not found in DB!`);
        process.exit(1);
    }
    console.log(`✅ Institute : ${inst.name} (${inst.code}) [ID: ${inst._id}]`);

    // Auto-expand student quota if needed (degree college will hold ~1,500+ students across 3 years)
    const currentMax = inst.limits?.maxStudents || 0;
    if (currentMax < 2000) {
        if (!isDryRun) {
            await Institute.updateOne({ _id: inst._id }, { $set: { 'limits.maxStudents': 2500 } });
            console.log(`  ℹ️  Upgraded institute student quota: ${currentMax} -> 2500 allotted`);
        } else {
            console.log(`  ℹ️  [DRY-RUN] Would upgrade student quota: ${currentMax} -> 2500 allotted`);
        }
    }

    // 2. Resolve Active Session
    let session = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName: { $regex: new RegExp(sessionName.replace(/-/g, '[-_ ]'), 'i') },
        deletedAt: null
    });

    if (!session) {
        // Fallback to active session
        session = await Session.findOne({
            $or: [{ instituteId: inst._id }, { institute: inst._id }],
            isActive: true,
            deletedAt: null
        });
    }

    if (!session) {
        console.log(`Session "${sessionName}" not found. Creating active session...`);
        if (!isDryRun) {
            session = await Session.create({
                sessionName: sessionName,
                instituteId: inst._id,
                startDate: new Date('2026-06-01'),
                endDate: new Date('2026-12-31'),
                isActive: true
            });
        } else {
            session = { _id: new mongoose.Types.ObjectId(), sessionName, isActive: true, startDate: new Date('2026-06-01'), endDate: new Date('2026-12-31') };
        }
    }
    console.log(`✅ Session   : ${session.sessionName} (${session._id})`);

    // Resolve actorId
    let adminUser = await User.findOne({
        $or: [
            { institute: inst._id, role: { $in: ['admin', 'super_admin'] } },
            { role: 'super_admin' }
        ],
        deletedAt: null
    });
    const actorId = adminUser?._id || new mongoose.Types.ObjectId();

    // 3. Resolve Courses
    const courses = await Course.find({ institute: inst._id, deletedAt: null });
    console.log(`✅ Courses   : ${courses.length} found`);
    const courseMap = new Map();
    for (const c of courses) {
        courseMap.set(c.code.toUpperCase(), c);
        courseMap.set(c.name.toUpperCase(), c);
    }

    // BSC Course mapping for streams
    const bscCourse = courses.find(c => c.code === 'BSC' || c.name.toLowerCase().includes('science'));
    if (bscCourse) {
        courseMap.set('CBZ', bscCourse);
        courseMap.set('PMCS', bscCourse);
    }

    // 4. Resolve or Auto-Create Batches
    // Blueprints for 1st Year (Semester 1):
    // BCOM: A, B, C, D
    // BCA:  A, B, C, D
    // BBA:  A, B
    // BSC:  CBZ - A, PMCS - B
    const existingBatches = await Batch.find({ institute: inst._id, session: session._id, deletedAt: null });
    const batchMap = new Map(); // `${courseId}_${sectionName}` -> batch
    for (const b of existingBatches) {
        batchMap.set(`${b.course.toString()}_${b.name.toUpperCase()}`, b);
    }

    // Function to get or create batch
    async function getOrCreateBatch(courseDoc, sectionName) {
        const key = `${courseDoc._id.toString()}_${sectionName.toUpperCase()}`;
        if (batchMap.has(key)) return batchMap.get(key);

        console.log(`  └─ Auto-creating batch: "${sectionName}" under ${courseDoc.name} (Sem 1)`);
        let batch;
        if (!isDryRun) {
            batch = await Batch.create({
                institute: inst._id,
                course: courseDoc._id,
                session: session._id,
                name: sectionName,
                semester: 1,
                capacity: 80,
                schedule: {
                    startDate: session.startDate || new Date('2026-06-01'),
                    endDate: session.endDate || new Date('2026-12-31')
                },
                createdBy: actorId,
                enrolledStudents: []
            });
        } else {
            batch = { _id: new mongoose.Types.ObjectId(), name: sectionName, course: courseDoc._id, session: session._id, enrolledStudents: [] };
        }
        batchMap.set(key, batch);
        return batch;
    }

    // =========================================================================
    // LOAD EXCEL SHEETS
    // =========================================================================
    console.log('\n--- Reading Excel Ledgers ---');
    const wbAdm = XLSX.readFile(admFile);
    const dAdm = XLSX.utils.sheet_to_json(wbAdm.Sheets['DATA'], { header: 1 });

    const wbSem = XLSX.readFile(semFile);
    const dSem = XLSX.utils.sheet_to_json(wbSem.Sheets['DATA'], { header: 1 });

    // Map Semester Fee rows by Student ID (column index 7)
    const semMap = new Map();
    for (let i = 2; i < dSem.length; i++) {
        const r = dSem[i];
        if (r && r[7]) semMap.set(String(r[7]).trim(), r);
    }
    console.log(`Loaded ${dAdm.length - 2} admission rows and ${semMap.size} semester fee rows.`);

    // Map Extended Profile (DOB, Blood Group, Parents, Address)
    const profileMap = new Map();
    if (fs.existsSync(profileFile)) {
        try {
            const wbProfile = XLSX.readFile(profileFile);
            const pSheet = wbProfile.Sheets['Sheet1'] ? 'Sheet1' : wbProfile.SheetNames[0];
            const pRows = XLSX.utils.sheet_to_json(wbProfile.Sheets[pSheet], { header: 1 });
            for (let i = 1; i < pRows.length; i++) {
                const r = pRows[i];
                if (!r) continue;
                const studId = String(r[2] || '').trim();
                const regNo = String(r[3] || '').trim();
                const info = {
                    dob: r[4],
                    bloodGroup: normalizeBloodGroup(r[5]),
                    fatherName: r[6] ? String(r[6]).trim() : undefined,
                    motherName: r[7] ? String(r[7]).trim() : undefined,
                    phone: r[8] ? String(r[8]).replace(/\D/g, '').slice(-10) : undefined,
                    street: r[9] ? String(r[9]).trim() : (r[12] ? String(r[12]).trim() : undefined),
                    city: r[10] ? String(r[10]).trim() : undefined,
                    pincode: r[11] ? String(r[11]).trim() : undefined,
                    photoNo: r[15] ? String(r[15]).trim() : undefined
                };
                if (studId) profileMap.set(studId.toUpperCase(), info);
                if (regNo) profileMap.set(regNo.toUpperCase(), info);
            }
            console.log(`Loaded ${profileMap.size} student profile records from Data Collection sheet.`);
        } catch (e) {
            console.warn(`⚠️  Could not read Data Collection sheet: ${e.message}`);
        }
    }

    // Map Photo CDN URLs
    const photoUrlMap = new Map();
    if (fs.existsSync(photoUrlsFile)) {
        try {
            const photoJson = JSON.parse(fs.readFileSync(photoUrlsFile, 'utf8'));
            for (const [k, v] of Object.entries(photoJson)) {
                photoUrlMap.set(k.toUpperCase(), v);
            }
            console.log(`Loaded ${photoUrlMap.size} photo CDN URLs from ${photoUrlsFile}.`);
        } catch (e) {
            console.warn(`⚠️  Could not read photo URLs file: ${e.message}`);
        }
    }
    console.log('');

    const defaultStudentHash = await bcrypt.hash('Student@123', 10);

    // =========================================================================
    // PROCESS STUDENTS
    // =========================================================================
    const stats = {
        total: dAdm.length - 2,
        processed: 0,
        skipped: 0,
        created: 0,
        existing: 0,
        enrolled: 0,
        fees: 0,
        errors: []
    };

    console.log('--- Ingesting Students & Fees ---');

    for (let i = 2; i < dAdm.length; i++) {
        const r1 = dAdm[i];
        const rowNum = i + 1;

        if (!r1 || !r1[7]) {
            stats.skipped++;
            continue;
        }

        const studentId = String(r1[7]).trim(); // SDC2026001
        const rawCourse = String(r1[2] || '').trim().toUpperCase(); // BCOM, BCA, BBA, CBZ, PMCS
        const rawSec = String(r1[5] || 'A').trim().toUpperCase(); // A, B, C, D
        const regNo = String(r1[6] || '').trim(); // U19ZE26S0014
        const studentName = String(r1[8] || '').trim();
        const parentPhone = String(r1[3] || '').replace(/\D/g, '').slice(-10);
        const studentPhone = String(r1[4] || '').replace(/\D/g, '').slice(-10);
        const admissionDate = normalizeDate(r1[1]) || session.startDate || new Date('2026-06-01');

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

            // 2. Resolve Target Batch Section Name
            // For BSC: CBZ -> CBZ - A, PMCS -> PMCS - B (Option 1)
            let sectionName = rawSec;
            if (rawCourse === 'CBZ') sectionName = `CBZ - ${rawSec}`;
            else if (rawCourse === 'PMCS') sectionName = `PMCS - ${rawSec}`;

            const batch = await getOrCreateBatch(targetCourse, sectionName);

            // 3. User Details
            const { firstName, lastName } = parseName(studentName);
            const safeId = studentId.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            let email = `${safeId}@sdcdeg.edu.in`;

            // Match extended profile
            const profileInfo = profileMap.get(studentId.toUpperCase()) || (regNo ? profileMap.get(regNo.toUpperCase()) : null);
            const avatarUrl = photoUrlMap.get(studentId.toUpperCase()) || (regNo ? photoUrlMap.get(regNo.toUpperCase()) : undefined);

            const dobDate = profileInfo?.dob ? normalizeDate(profileInfo.dob) : undefined;
            const bloodGroup = profileInfo?.bloodGroup || undefined;
            const fatherName = profileInfo?.fatherName || undefined;
            const motherName = profileInfo?.motherName || undefined;
            const fatherPhoneFinal = profileInfo?.phone || parentPhone || undefined;

            const addressObj = (profileInfo?.street || profileInfo?.city || profileInfo?.pincode) ? {
                street: profileInfo.street || '',
                city: profileInfo.city || '',
                pincode: profileInfo.pincode || ''
            } : undefined;

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
                            ...(dobDate && { dateOfBirth: dobDate }),
                            ...(bloodGroup && { bloodGroup }),
                            ...(addressObj && { address: addressObj }),
                            ...(avatarUrl && { avatar: avatarUrl })
                        },
                        ...(fatherName && { fatherName }),
                        ...(motherName && { motherName }),
                        ...(fatherPhoneFinal && { fatherPhone: fatherPhoneFinal }),
                        ...(admissionDate && { admissionDate }),
                        admissionStd: targetCourse.name,
                        activeSession: session._id,
                        activeSessions: [session._id]
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
                    // Enrich existing student if profile info is present
                    const updateFields = {};
                    if (dobDate && !student.profile?.dateOfBirth) updateFields['profile.dateOfBirth'] = dobDate;
                    if (bloodGroup && !student.profile?.bloodGroup) updateFields['profile.bloodGroup'] = bloodGroup;
                    if (addressObj && !student.profile?.address?.city) updateFields['profile.address'] = addressObj;
                    if (avatarUrl && !student.profile?.avatar) updateFields['profile.avatar'] = avatarUrl;
                    if (fatherName && !student.fatherName) updateFields['fatherName'] = fatherName;
                    if (motherName && !student.motherName) updateFields['motherName'] = motherName;
                    if (fatherPhoneFinal && !student.fatherPhone) updateFields['fatherPhone'] = fatherPhoneFinal;
                    if (Object.keys(updateFields).length > 0) {
                        await User.updateOne({ _id: student._id }, { $set: updateFields });
                    }
                }
            }

            // 4. Enroll in Batch
            if (!isDryRun) {
                await Batch.updateOne(
                    { _id: batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date(), status: 'active' } } }
                );
            }
            stats.enrolled++;

            // 5. Fee Ledger Reconciliation
            const r2 = semMap.get(studentId) || [];

            const admFixation = normalizeNumber(r1[13]);
            const admPaid = normalizeNumber(r1[14]);
            const admBal = normalizeNumber(r1[15]);

            const semFixation = normalizeNumber(r2[11]);
            const semPaid = normalizeNumber(r2[13]);
            const semBal = normalizeNumber(r2[14]);

            const totalAmount = admFixation + semFixation;
            const paidAmount = admPaid + semPaid;
            const balanceAmount = Math.max(0, admBal + semBal);

            if (totalAmount > 0) {
                const installments = [];
                let totalInstSum = 0;

                // A. Extract Admission Fee Installments (col 16 to 33, triples: date, mode, amount)
                let admCount = 1;
                for (let k = 16; k < 34; k += 3) {
                    const amt = normalizeNumber(r1[k + 2]);
                    if (amt > 0) {
                        const dVal = normalizeDate(r1[k]) || admissionDate || new Date();
                        const modeStr = String(r1[k + 1] || 'CASH').trim();
                        installments.push({
                            _id: new mongoose.Types.ObjectId(),
                            amount: amt,
                            dueDate: dVal,
                            paidDate: dVal,
                            status: 'paid',
                            paymentMethod: mapPaymentMethod(modeStr),
                            notes: `Admission Fee — Installment #${admCount} (${modeStr})`
                        });
                        totalInstSum += amt;
                        admCount++;
                    }
                }

                // B. Extract Sem 1 Fee Installments (col 15 to 26, triples: date, mode, amt)
                let semCount = 1;
                for (let k = 15; k < 27; k += 3) {
                    const amt = normalizeNumber(r2[k + 2]);
                    if (amt > 0) {
                        const dVal = normalizeDate(r2[k]) || admissionDate || new Date();
                        const modeStr = String(r2[k + 1] || 'CASH').trim();
                        installments.push({
                            _id: new mongoose.Types.ObjectId(),
                            amount: amt,
                            dueDate: dVal,
                            paidDate: dVal,
                            status: 'paid',
                            paymentMethod: mapPaymentMethod(modeStr),
                            notes: `Semester 1 Fee — Installment #${semCount} (${modeStr})`
                        });
                        totalInstSum += amt;
                        semCount++;
                    }
                }

                // C. Add pending balance installment if any
                if (balanceAmount > 0) {
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: Math.round(balanceAmount * 100) / 100,
                        dueDate: session.endDate || new Date('2026-12-31'),
                        status: 'pending',
                        notes: 'Remaining Semester 1 balance'
                    });
                }

                // Auto-balance rounding check for pre-save hook
                const instTotal = installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(instTotal - totalAmount) > 0.01 && installments.length > 0) {
                    installments[installments.length - 1].amount += (totalAmount - instTotal);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({
                        institute: inst._id,
                        student: student._id,
                        batch: batch._id,
                        deletedAt: null
                    });

                    if (!exists) {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: batch._id,
                            session: session._id,
                            totalAmount,
                            paidAmount,
                            balanceAmount,
                            status: balanceAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'not_started'),
                            components: [
                                { name: "Admission Fee", amount: admFixation },
                                { name: "Semester 1 Tuition Fee", amount: semFixation }
                            ],
                            installments
                        });
                        stats.fees++;
                    }
                } else {
                    stats.fees++;
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
    console.log(`Mode              : ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`Total Rows        : ${stats.total}`);
    console.log(`Processed         : ${stats.processed}`);
    console.log(`Skipped           : ${stats.skipped}`);
    console.log(`Students Created  : ${stats.created}`);
    console.log(`Students Existing : ${stats.existing}`);
    console.log(`Enrollments       : ${stats.enrolled}`);
    console.log(`Batches Active    : ${batchMap.size}`);
    console.log(`Fee Records       : ${stats.fees}`);
    console.log(`Errors            : ${stats.errors.length}`);
    if (stats.errors.length) {
        console.log('\nErrors:');
        stats.errors.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`));
        if (stats.errors.length > 20) console.log(`  ... and ${stats.errors.length - 20} more`);
    }
    console.log('=================================================================');
    if (!isDryRun && stats.created > 0) {
        console.log('\n✅ Sample student credentials:');
        console.log(`   Email    : sdc2026001@sdcdeg.edu.in`);
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
