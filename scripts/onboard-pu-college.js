/**
 * SDC Independent PU College — Student Onboarding Script
 *
 * Assumes institute, session, courses, and batches already exist in prod.
 * This script ONLY creates: Users, Memberships, Batch enrollments, Fee records.
 *
 * Usage:
 *   node scripts/onboard-pu-college.js --dry-run
 *   node scripts/onboard-pu-college.js
 *
 * Optional overrides:
 *   --file     "path/to/students.xlsx"
 *   --fee-file "path/to/fees.xlsx"
 *   --session  "2026-27"
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// SECTION NAME MAP
// Spreadsheet has bare "C1", "J1" — prod batches are named "I C1", "I J1"
// ============================================================================
const SECTION_NAME_MAP = {
    'C1': 'I C1',
    'C2': 'I C2',
    'C3': 'I C3',
    'J1': 'I J1',
    'J2': 'I J2',
};

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
        const ddmmyyyy = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddmmyyyy) return new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
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

function normalizeGender(g) {
    if (!g) return 'Male';
    const l = String(g).trim().toLowerCase();
    if (l.startsWith('f')) return 'Female';
    if (l.startsWith('m')) return 'Male';
    return 'Other';
}

// Flexible column lookup — ignores case, spaces, special chars
function col(row, ...aliases) {
    for (const k of Object.keys(row)) {
        const nk = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const a of aliases) {
            if (nk === a.trim().toLowerCase().replace(/[^a-z0-9]/g, '')) return row[k];
        }
    }
    return '';
}

// ============================================================================
// MAIN
// ============================================================================

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    // --- CLI args ---
    const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

    const sessionName = get('--session') || '2026-27';
    const instituteCode = (get('--institute') || 'SDCPUK').toUpperCase();

    // Student file — try CLI arg then common default paths
    let filePath = get('--file') ? path.resolve(get('--file')) : null;
    if (!filePath) {
        for (const c of [
            'C:/Users/Comp/Downloads/I PUC DETAILS id cards.xlsx',
            'C:/Users/Comp/Downloads/I PUC DETAILS 2026-27.xlsx',
        ]) {
            if (fs.existsSync(c)) { filePath = c; break; }
        }
    }

    // Fee file
    let feeFilePath = get('--fee-file') ? path.resolve(get('--fee-file')) : null;
    if (!feeFilePath) {
        for (const c of [
            'C:/Users/Comp/Downloads/I PU Fees 2026 - 27 (ARP).xlsx',
            'C:/Users/Comp/Downloads/I PUC DETAILS 2026-27 (1).xlsx',
        ]) {
            if (fs.existsSync(c)) { feeFilePath = c; break; }
        }
    }

    // --- Banner ---
    console.log('=================================================================');
    console.log('   SDC INDEPENDENT PU COLLEGE — STUDENT ONBOARDING              ');
    console.log('=================================================================');
    console.log(`Institute  : ${instituteCode}`);
    console.log(`Session    : ${sessionName}`);
    console.log(`Mode       : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE'}`);
    console.log(`Students   : ${filePath || '❌ NOT FOUND'}`);
    console.log(`Fees       : ${feeFilePath || '⚠️  NOT FOUND (fees will be skipped)'}`);
    console.log('-----------------------------------------------------------------\n');

    if (!filePath || !fs.existsSync(filePath)) {
        console.error('❌ Student file not found. Use --file "path/to/file.xlsx"');
        process.exit(1);
    }

    // --- Connect ---
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) { console.error('❌ MONGODB_URI not set in .env.local'); process.exit(1); }

    if (!isDryRun && mongoUri.includes('localhost')) {
        console.warn('⚠️  MONGODB_URI points to localhost — is this really production?');
        console.warn('   Ctrl+C within 5s to cancel...\n');
        await new Promise(r => setTimeout(r, 5000));
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // --- Load models ---
    const Institute  = mongoose.models.Institute  || (await import('../models/Institute.js')).default;
    const Session    = mongoose.models.Session    || (await import('../models/Session.js')).default;
    const Course     = mongoose.models.Course     || (await import('../models/Course.js')).default;
    const Batch      = mongoose.models.Batch      || (await import('../models/Batch.js')).default;
    const User       = mongoose.models.User       || (await import('../models/User.js')).default;
    const Fee        = mongoose.models.Fee        || (await import('../models/Fee.js')).default;
    const Membership = mongoose.models.Membership || (await import('../models/Membership.js')).default;

    // =========================================================================
    // PREFLIGHT — verify institute, session, courses, batches exist
    // =========================================================================
    console.log('--- Preflight Check ---');

    const inst = await Institute.findOne({ code: instituteCode, deletedAt: null });
    if (!inst) {
        console.error(`❌ Institute "${instituteCode}" not found in this database. Wrong MONGODB_URI?`);
        process.exit(1);
    }
    console.log(`✅ Institute : ${inst.name} (${inst._id})`);

    const session = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName,
        deletedAt: null,
    });
    if (!session) {
        console.error(`❌ Session "${sessionName}" not found for this institute.`);
        process.exit(1);
    }
    console.log(`✅ Session   : ${session.sessionName} (${session._id})`);

    // Load all courses for this institute
    const allCourses = await Course.find({ institute: inst._id, deletedAt: null });
    console.log(`✅ Courses   : ${allCourses.length} found`);
    allCourses.forEach(c => console.log(`     ${c.code.padEnd(8)} ${c.name}`));

    // Build course lookup map: code, name, and bare combination ("EBACS") -> course
    const courseMap = new Map();
    for (const c of allCourses) {
        courseMap.set(c.code.toUpperCase(), c);
        courseMap.set(c.name.toUpperCase(), c);
        // "EBACS" -> I PUC EBACS (only for I PUC rows)
        const m = c.name.match(/(EBACS|EBAS|PCMB|PCMCS)/i);
        if (m && c.name.startsWith('I PUC')) courseMap.set(m[1].toUpperCase(), c);
    }

    // Load all batches for this institute + session
    const allBatches = await Batch.find({ institute: inst._id, session: session._id, deletedAt: null });
    console.log(`✅ Batches   : ${allBatches.length} found`);
    allBatches.forEach(b => console.log(`     ${b.name.padEnd(8)} (course: ${b.course})`));

    // Build batch lookup: `${courseId}_${batchName}` -> batch
    // Register under both prod name ("I C1") and raw name ("C1") for each batch
    const batchMap = new Map();
    for (const b of allBatches) {
        const cid = b.course.toString();
        batchMap.set(`${cid}_${b.name.toUpperCase()}`, b);
        // Also register under bare suffix ("I C1" -> also "C1")
        const bare = b.name.replace(/^I\s+/i, '').replace(/^II\s+/i, '').trim().toUpperCase();
        if (bare !== b.name.toUpperCase()) batchMap.set(`${cid}_${bare}`, b);
    }

    console.log('\n');

    // =========================================================================
    // LOAD EXCEL DATA
    // =========================================================================
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames.includes('Data') ? 'Data' : wb.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    console.log(`Loaded students sheet "${sheetName}": ${rawRows.length} rows`);

    // Load fee master
    const feeMap = new Map();
    if (feeFilePath && fs.existsSync(feeFilePath)) {
        const fwb = XLSX.readFile(feeFilePath);
        const fsn = fwb.SheetNames.includes('Admission') ? 'Admission' : fwb.SheetNames[0];
        const frows = XLSX.utils.sheet_to_json(fwb.Sheets[fsn], { defval: '' });
        for (const fr of frows) {
            const sid = String(fr['Student id'] || fr['COLLEGE ID'] || '').trim();
            if (sid) feeMap.set(sid, fr);
        }
        console.log(`Loaded fee sheet "${fsn}": ${feeMap.size} records`);
    }

    const defaultHash = await bcrypt.hash('Student@123', 10);

    // =========================================================================
    // PROCESS STUDENTS
    // =========================================================================
    const stats = { total: rawRows.length, processed: 0, skipped: 0, created: 0, existing: 0, enrolled: 0, fees: 0, feeSkipped: 0, errors: [] };

    console.log('\n--- Importing Students ---');

    for (let i = 0; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        const rowNum = i + 2;

        try {
            // Strip phantom __EMPTY_* columns from merged cells
            const row = {};
            for (const [k, v] of Object.entries(rawRow)) {
                if (k.startsWith('__EMPTY') && (v === '' || v === undefined)) continue;
                row[k.trim()] = v;
            }

            const collegeId   = String(col(row, 'COLLEGE ID', 'Student id', 'COLLEGEID') || '').trim();
            const studentName = String(col(row, 'NAME', 'Student Name', 'STUDENTNAME') || '').trim();
            const combination = String(col(row, 'COMBINATION', 'Combination', 'COMB') || '').trim().toUpperCase();
            const rawSection  = String(col(row, 'SEC', 'Section', 'SECTION') || '').trim().toUpperCase();

            // Skip empty rows
            if (!studentName && !collegeId) { stats.skipped++; continue; }
            if (!studentName || !collegeId) {
                stats.errors.push(`Row ${rowNum}: Missing name or ID — name="${studentName}" id="${collegeId}"`);
                stats.skipped++;
                continue;
            }

            stats.processed++;

            // --- Resolve Course ---
            let course = courseMap.get(combination) || courseMap.get(`I PUC ${combination}`);
            if (!course) {
                stats.errors.push(`Row ${rowNum}: Unknown combination "${combination}" for "${studentName}" (${collegeId})`);
                continue;
            }

            // --- Resolve Batch ---
            const cid = course._id.toString();
            const prodSectionName = SECTION_NAME_MAP[rawSection] || `I ${rawSection}`;
            let batch = batchMap.get(`${cid}_${prodSectionName.toUpperCase()}`)
                     || batchMap.get(`${cid}_${rawSection}`);

            if (!batch) {
                stats.errors.push(`Row ${rowNum}: Section "${rawSection}" (expected "${prodSectionName}") not found under ${course.name}. Available batches: ${allBatches.filter(b => b.course.toString() === cid).map(b => b.name).join(', ')}`);
                continue;
            }

            // --- Demographics ---
            const { firstName, lastName } = parseName(studentName);
            const phone          = String(col(row, 'PHONE NO', 'PHONENO', 'Mobile No') || '').replace(/\D/g, '').slice(-10);
            const phone2         = String(col(row, 'PHONE NO.2', 'PHONENO2', 'Phone 2') || '').replace(/\D/g, '').slice(-10);
            const satsNo         = String(col(row, 'SATS NO', 'SATS NO.', 'SATSNO') || '').trim();
            const admissionNo    = String(col(row, 'ADMISSION NO', 'Admission No', 'ADMISSIONNO') || '').trim();
            const regNo          = String(col(row, 'REG . NO', 'REG NO', 'Reg No', 'REGNO') || '').trim();
            const admissionDate  = normalizeDate(col(row, 'ADMISSION DATE', 'Admission Date', 'admissio n date'));
            const dob            = normalizeDate(col(row, 'DATE OF BIRTH', 'Date of Birth', 'DOB'));
            const gender         = normalizeGender(col(row, 'GENDER', 'Gender'));
            const fatherName     = String(col(row, 'FATHER NAME', 'Father Name', 'FATHERNAME') || '').trim();
            const motherName     = String(col(row, 'MOTHER NAME', 'Mother Name', 'MOTHERNAME') || '').trim();
            const address        = String(col(row, 'ADDRESS', 'Address') || '').trim();
            const nationality    = String(col(row, 'NATIONALITY', 'Nationality') || 'Indian').trim();
            const language       = String(col(row, 'LANGUAGE', 'Language', 'Mother Tongue') || '').trim();
            const tcDetails      = String(col(row, 'Transfer Certificate No/Date', 'TC') || '').trim();
            const lastSchool     = String(col(row, 'INSTITUTION STUDIED', 'Previous School') || '').trim();

            const safeId = collegeId.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            let email = `${safeId}@sdcpuk.edu.in`;

            const remarks = [
                regNo     ? `Reg: ${regNo}`         : '',
                tcDetails ? `TC: ${tcDetails}`       : '',
                phone2    ? `Alt: ${phone2}`         : '',
            ].filter(Boolean).join(' | ');

            // --- Find or Create Student ---
            let student = await User.findOne({ institute: inst._id, enrollmentNumber: collegeId, deletedAt: null })
                       || await User.findOne({ email, deletedAt: null });

            if (!student) {
                if (isDryRun) {
                    student = { _id: new mongoose.Types.ObjectId(), enrollmentNumber: collegeId, email };
                    stats.created++;
                } else {
                    const userDoc = {
                        institute: inst._id,
                        role: 'student',
                        email,
                        passwordHash: defaultHash,
                        enrollmentNumber: collegeId,
                        profile: {
                            firstName: firstName || 'Student',
                            lastName: lastName || '',
                            gender,
                            ...(dob   && { dateOfBirth: dob }),
                            ...(phone && { phone }),
                            ...(address && { address: { street: address } }),
                        },
                        ...(admissionDate && { admissionDate }),
                        ...(regNo         && { grNumber: regNo }),
                        ...(admissionNo && !regNo && { grNumber: admissionNo }),
                        ...(satsNo        && { statsNo: satsNo }),
                        ...(fatherName    && { fatherName }),
                        ...(motherName    && { motherName }),
                        ...(phone2        && { fatherPhone: phone2 }),
                        ...(nationality   && { nationality }),
                        ...(language      && { motherTongue: language }),
                        ...(lastSchool    && { lastSchoolAttended: lastSchool }),
                        ...(remarks       && { remarks }),
                        admissionStd: course.name,
                        activeSession: session._id,
                        activeSessions: [session._id],
                    };

                    try {
                        student = await User.create(userDoc);
                    } catch (e) {
                        if (e.code === 11000) {
                            // Duplicate email — suffix with row number
                            userDoc.email = `${safeId}${rowNum}@sdcpuk.edu.in`;
                            student = await User.create(userDoc);
                            console.log(`  Row ${rowNum}: Email collision, used ${userDoc.email}`);
                        } else throw e;
                    }

                    // Membership (upsert — safe if re-run)
                    await Membership.findOneAndUpdate(
                        { user: student._id, institute: inst._id },
                        { $setOnInsert: { user: student._id, institute: inst._id, role: 'student', isActive: true } },
                        { upsert: true }
                    );
                    stats.created++;
                }
            } else {
                stats.existing++;
            }

            // --- Enroll in Batch (idempotent) ---
            if (!isDryRun) {
                await Batch.updateOne(
                    { _id: batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date(), status: 'active' } } }
                );
            }
            stats.enrolled++;

            // --- Fee Record ---
            const feeRow = { ...row, ...(feeMap.get(collegeId) || {}) };
            const fixation  = normalizeNumber(col(feeRow, 'Fixation', 'FIXATION', 'Total Fee'));
            const paidSheet = normalizeNumber(col(feeRow, 'Paid', 'PAID'));

            if (fixation <= 0) {
                stats.feeSkipped++;
            } else {
                // Collect paid installments (up to 10)
                const installments = [];
                let totalPaid = 0;
                const allKeys = Object.keys(feeRow);

                for (let k = 1; k <= 10; k++) {
                    const amtKey = allKeys.find(key =>
                        new RegExp(`^${k}(st|nd|rd|th)?\\s*Install\\s*ment`, 'i').test(key.trim())
                    );
                    if (!amtKey) continue;
                    const amount = normalizeNumber(feeRow[amtKey]);
                    if (amount <= 0) continue;

                    // Date column is always the next column in the sheet
                    const dateKey = allKeys[allKeys.indexOf(amtKey) + 1];
                    const paidOn  = normalizeDate(dateKey ? feeRow[dateKey] : null) || admissionDate || new Date();

                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount,
                        dueDate: paidOn,
                        paidDate: paidOn,
                        status: 'paid',
                        paymentMethod: 'cash',
                        notes: `Installment #${k} — imported`,
                    });
                    totalPaid += amount;
                }

                const effectivePaid = totalPaid > 0 ? totalPaid : paidSheet;
                const balance = Math.max(0, fixation - effectivePaid);

                if (balance > 0) {
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: Math.round(balance * 100) / 100,
                        dueDate: session.endDate || new Date('2027-03-31'),
                        status: 'pending',
                        notes: 'Remaining balance — imported',
                    });
                }

                // Plug any rounding gap so pre-save hook doesn't throw
                const instTotal = installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(instTotal - fixation) > 0.01) {
                    installments[installments.length - 1].amount += (fixation - instTotal);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({ institute: inst._id, student: student._id, batch: batch._id, deletedAt: null });
                    if (!exists) {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: batch._id,
                            session: session._id,
                            totalAmount: fixation,
                            paidAmount: effectivePaid,
                            balanceAmount: balance,
                            status: balance <= 0 ? 'paid' : effectivePaid > 0 ? 'partial' : 'not_started',
                            installments,
                        });
                        stats.fees++;
                    }
                } else {
                    stats.fees++;
                }
            }

        } catch (err) {
            const id = String(rawRows[i]?.['COLLEGE ID'] || rawRows[i]?.['Student id'] || '').trim();
            stats.errors.push(`Row ${rowNum} (${id}): ${err.message}`);
            console.error(`  ❌ Row ${rowNum} ${id}: ${err.message}`);
        }
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n=================================================================');
    console.log('                      SUMMARY REPORT                            ');
    console.log('=================================================================');
    console.log(`Mode              : ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`Total Rows        : ${stats.total}`);
    console.log(`Processed         : ${stats.processed}`);
    console.log(`Skipped (empty)   : ${stats.skipped}`);
    console.log(`Students Created  : ${stats.created}`);
    console.log(`Students Existing : ${stats.existing}`);
    console.log(`Enrollments       : ${stats.enrolled}`);
    console.log(`Fee Records       : ${stats.fees}`);
    console.log(`Fees Skipped      : ${stats.feeSkipped}  (no fee data in sheet)`);
    console.log(`Errors            : ${stats.errors.length}`);
    if (stats.errors.length) {
        console.log('\nErrors:');
        stats.errors.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`));
        if (stats.errors.length > 20) console.log(`  ... and ${stats.errors.length - 20} more`);
    }
    console.log('=================================================================');
    if (!isDryRun && stats.created > 0) {
        const sample = String(rawRows.find(r => r['COLLEGE ID'] || r['Student id'])?.[' COLLEGE ID'] || rawRows[0]?.['COLLEGE ID'] || 'sdcpuk001').replace(/[^A-Za-z0-9]/g,'').toLowerCase();
        console.log('\n✅ Login credentials for imported students:');
        console.log(`   Email    : <collegeid_lowercase>@sdcpuk.edu.in`);
        console.log(`   Password : Student@123`);
        console.log(`   Example  : ${sample}@sdcpuk.edu.in / Student@123`);
    }
    console.log('');

    await mongoose.disconnect();
    process.exit(stats.errors.length > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
