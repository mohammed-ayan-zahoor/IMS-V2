/**
 * SDC Independent PU College — Comprehensive Student Onboarding Script
 * Supports both I PUC and II PUC.
 *
 * For II PUC, auto-creates active sections (e.g., II M1, II S1 A) under their
 * respective courses if they do not exist yet.
 *
 * Usage:
 *   node scripts/onboard-pu-college.js --puc 2 --dry-run
 *   node scripts/onboard-pu-college.js --puc 2
 *
 * (For I PUC):
 *   node scripts/onboard-pu-college.js --puc 1 --dry-run
 *   node scripts/onboard-pu-college.js --puc 1
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
        // Supports DD.MM.YY, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
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

function normalizeGender(g) {
    if (!g) return 'Male';
    const l = String(g).trim().toLowerCase();
    if (l.startsWith('f')) return 'Female';
    if (l.startsWith('m')) return 'Male';
    return 'Other';
}

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

    const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

    const sessionName = get('--session') || '2026-27';
    const instituteCode = (get('--institute') || 'SDCPUK').toUpperCase();
    const pucYear = get('--puc') || get('--year') || '2'; // default to II PUC if not specified

    // Determine default file paths according to PUC year
    let defaultStudentFile, defaultFeeFile;
    if (String(pucYear).includes('2')) {
        defaultStudentFile = path.join(__dirname, 'data', 'II PUC DETAILS 2026-27-1.xlsx');
        defaultFeeFile = path.join(__dirname, 'data', 'II PU Fees 2026 - 27 (ARP).xlsx');
    } else {
        defaultStudentFile = path.join(__dirname, 'data', 'I PUC DETAILS id cards.xlsx');
        defaultFeeFile = path.join(__dirname, 'data', 'I PU Fees 2026 - 27 (ARP).xlsx');
    }

    let filePath = get('--file') ? path.resolve(get('--file')) : defaultStudentFile;
    let feeFilePath = get('--fee-file') ? path.resolve(get('--fee-file')) : defaultFeeFile;

    // Fallbacks if not in scripts/data/
    if (!fs.existsSync(filePath)) {
        const altCandidates = [
            'C:/Users/Comp/Downloads/II PUC DETAILS 2026-27-1.xlsx',
            'C:/Users/Comp/Downloads/I PUC DETAILS id cards.xlsx'
        ];
        for (const c of altCandidates) {
            if (fs.existsSync(c)) { filePath = c; break; }
        }
    }
    if (!fs.existsSync(feeFilePath)) {
        const altFeeCandidates = [
            'C:/Users/Comp/Downloads/II PU Fees 2026 - 27 (ARP).xlsx',
            'C:/Users/Comp/Downloads/I PU Fees 2026 - 27 (ARP).xlsx'
        ];
        for (const c of altFeeCandidates) {
            if (fs.existsSync(c)) { feeFilePath = c; break; }
        }
    }

    console.log('=================================================================');
    console.log(`   SDC INDEPENDENT PU COLLEGE — ${pucYear === '2' ? 'II PUC' : 'I PUC'} ONBOARDING`);
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

    // =========================================================================
    // PREFLIGHT CHECK
    // =========================================================================
    console.log('--- Preflight Check ---');

    const inst = await Institute.findOne({ code: instituteCode, deletedAt: null });
    if (!inst) {
        console.error(`❌ Institute "${instituteCode}" not found in this database.`);
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

    // Actor ID for createdBy
    let adminUser = await User.findOne({
        $or: [
            { institute: inst._id, role: { $in: ['admin', 'super_admin'] } },
            { role: 'super_admin' }
        ],
        deletedAt: null
    });
    const actorId = adminUser?._id || new mongoose.Types.ObjectId();

    // Load courses
    const allCourses = await Course.find({ institute: inst._id, deletedAt: null });
    console.log(`✅ Courses   : ${allCourses.length} found`);
    allCourses.forEach(c => console.log(`     ${c.code.padEnd(8)} ${c.name}`));

    const courseMap = new Map();
    for (const c of allCourses) {
        courseMap.set(c.code.toUpperCase(), c);
        courseMap.set(c.name.toUpperCase(), c);
        // Map combinations: "EBACS" -> "II PUC EBACS" (or "I PUC EBACS" depending on year)
        const m = c.name.match(/(EBACS|EBAS|PCMB|PCMCS)/i);
        if (m) {
            if (pucYear === '2' && c.name.startsWith('II PUC')) {
                courseMap.set(m[1].toUpperCase(), c);
            } else if (pucYear !== '2' && c.name.startsWith('I PUC')) {
                courseMap.set(m[1].toUpperCase(), c);
            }
        }
    }

    // Load batches
    const allBatches = await Batch.find({ institute: inst._id, session: session._id, deletedAt: null });
    console.log(`✅ Batches   : ${allBatches.length} existing found`);

    const batchMap = new Map();
    for (const b of allBatches) {
        const cid = b.course.toString();
        batchMap.set(`${cid}_${b.name.toUpperCase()}`, b);
        const bare = b.name.replace(/^I\s+/i, '').replace(/^II\s+/i, '').trim().toUpperCase();
        if (bare !== b.name.toUpperCase()) batchMap.set(`${cid}_${bare}`, b);
    }

    console.log('\n');

    // =========================================================================
    // LOAD EXCEL DATA
    // =========================================================================
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames.includes('Sheet1') ? 'Sheet1' : (wb.SheetNames.includes('Data') ? 'Data' : wb.SheetNames[0]);
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    console.log(`Loaded students sheet "${sheetName}": ${rawRows.length} rows`);

    // Load Fee Master with robust 2D array parsing
    const feeMap = new Map();
    if (feeFilePath && fs.existsSync(feeFilePath)) {
        const fwb = XLSX.readFile(feeFilePath);
        const fsn = fwb.SheetNames.includes('Admission') ? 'Admission' : fwb.SheetNames[0];
        const rawGrid = XLSX.utils.sheet_to_json(fwb.Sheets[fsn], { header: 1 });
        
        // Find row that contains "Student id"
        const headerIdx = rawGrid.findIndex(r => r && r.some(c => typeof c === 'string' && c.trim().toLowerCase().includes('student id')));
        if (headerIdx !== -1) {
            const fHeaders = rawGrid[headerIdx];
            const dataRows = rawGrid.slice(headerIdx + 1);

            for (const r of dataRows) {
                if (!r || !r.length) continue;
                // Student ID is typically at column index 3 (or match by header)
                const idColIdx = fHeaders.findIndex(h => typeof h === 'string' && h.trim().toLowerCase().includes('student id'));
                const sid = String(r[idColIdx] || '').trim();
                if (!sid) continue;

                // Extract installments & dates directly from grid columns
                const installments = [];
                for (let k = 1; k <= 10; k++) {
                    const instColIdx = fHeaders.findIndex(h => typeof h === 'string' && new RegExp(`^${k}(st|nd|rd|th)?\\s*install`, 'i').test(h.trim()));
                    if (instColIdx !== -1) {
                        const amt = normalizeNumber(r[instColIdx]);
                        if (amt > 0) {
                            const dateVal = r[instColIdx + 1]; // Date is in adjacent column
                            installments.push({
                                num: k,
                                amount: amt,
                                date: normalizeDate(dateVal)
                            });
                        }
                    }
                }

                // Extract fixation, paid, balance
                const fixColIdx = fHeaders.findIndex(h => typeof h === 'string' && h.trim().toLowerCase().includes('fixation'));
                const paidColIdx = fHeaders.findIndex(h => typeof h === 'string' && h.trim().toLowerCase() === 'paid');
                const balColIdx = fHeaders.findIndex(h => typeof h === 'string' && h.trim().toLowerCase().includes('balance'));

                feeMap.set(sid, {
                    studentId: sid,
                    fixation: fixColIdx !== -1 ? normalizeNumber(r[fixColIdx]) : 0,
                    paid: paidColIdx !== -1 ? normalizeNumber(r[paidColIdx]) : 0,
                    balance: balColIdx !== -1 ? normalizeNumber(r[balColIdx]) : 0,
                    installments
                });
            }
            console.log(`Loaded fee sheet "${fsn}": ${feeMap.size} records with installment schedules`);
        }
    }

    const defaultHash = await bcrypt.hash('Student@123', 10);

    // =========================================================================
    // PROCESS STUDENTS
    // =========================================================================
    const stats = {
        total: rawRows.length,
        processed: 0,
        skipped: 0,
        created: 0,
        existing: 0,
        enrolled: 0,
        batchesCreated: 0,
        fees: 0,
        feeSkipped: 0,
        errors: []
    };

    console.log('\n--- Importing Students ---');

    for (let i = 0; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        const rowNum = i + 2;

        try {
            const row = {};
            for (const [k, v] of Object.entries(rawRow)) {
                if (k.startsWith('__EMPTY') && (v === '' || v === undefined)) continue;
                row[k.trim()] = v;
            }

            const collegeId   = String(col(row, 'COLLEGE ID', 'COLLEGE ID ', 'Student id', 'COLLEGEID') || '').trim();
            const studentName = String(col(row, 'NAME', 'NAME ', 'Student Name', 'STUDENTNAME') || '').trim();
            const combination = String(col(row, 'COMBINATION', 'Combination', 'COMB') || '').trim().toUpperCase();
            const rawSection  = String(col(row, 'Section', 'SEC', 'SECTION') || '').trim().toUpperCase();
            const classOfAdm  = String(col(row, 'Class of Admission ', 'Class of Admission', 'CLASS OF ADMISSION') || '').trim();

            if (!studentName && !collegeId) { stats.skipped++; continue; }
            if (!studentName || !collegeId) {
                stats.errors.push(`Row ${rowNum}: Missing name or ID — name="${studentName}" id="${collegeId}"`);
                stats.skipped++;
                continue;
            }

            stats.processed++;

            // --- Resolve Course ---
            let course = null;
            if (classOfAdm) {
                course = courseMap.get(classOfAdm.toUpperCase());
            }
            if (!course && combination) {
                const prefix = pucYear === '2' ? 'II PUC ' : 'I PUC ';
                course = courseMap.get(`${prefix}${combination}`) || courseMap.get(combination);
            }
            if (!course) {
                stats.errors.push(`Row ${rowNum}: Unknown course/combination "${classOfAdm || combination}" for "${studentName}" (${collegeId})`);
                continue;
            }

            // --- Resolve or Auto-Create Batch (Option A: "II M1", "II S1 A") ---
            const cid = course._id.toString();
            const secPrefix = pucYear === '2' ? 'II ' : 'I ';
            const targetSectionName = rawSection.startsWith(secPrefix) ? rawSection : `${secPrefix}${rawSection}`;

            let batch = batchMap.get(`${cid}_${targetSectionName.toUpperCase()}`)
                     || batchMap.get(`${cid}_${rawSection}`);

            if (!batch) {
                // Section does not exist yet under this course -> Auto-create section (Option A)
                console.log(`  Row ${rowNum}: Creating section "${targetSectionName}" under course "${course.name}"`);
                if (!isDryRun) {
                    batch = await Batch.create({
                        institute: inst._id,
                        course: course._id,
                        session: session._id,
                        name: targetSectionName,
                        capacity: 60,
                        schedule: {
                            startDate: session.startDate || new Date('2026-06-01'),
                            endDate: session.endDate || new Date('2027-03-31')
                        },
                        createdBy: actorId,
                        enrolledStudents: []
                    });
                } else {
                    batch = { _id: new mongoose.Types.ObjectId(), name: targetSectionName, course: course._id, session: session._id, enrolledStudents: [] };
                }
                batchMap.set(`${cid}_${targetSectionName.toUpperCase()}`, batch);
                batchMap.set(`${cid}_${rawSection}`, batch);
                stats.batchesCreated++;
            }

            // --- Demographics ---
            const { firstName, lastName } = parseName(studentName);
            const phone          = String(col(row, 'Contact Number', 'PHONE NO', 'PHONE NO.', 'Mobile No') || '').replace(/\D/g, '').slice(-10);
            const phone2         = String(col(row, 'PHONE NO.2', 'Contact Num 1') || '').replace(/\D/g, '').slice(-10);
            const satsNo         = String(col(row, 'SATS NO', 'SATS NO.', 'SATSNO') || '').trim();
            const admissionNo    = String(col(row, 'ADMISSION NO.\r\n', 'ADMISSION NO', 'Admission No') || '').trim();
            const regNo          = String(col(row, 'REG . NO', 'REG NO', 'Reg No') || '').trim();
            const admissionDate  = normalizeDate(col(row, 'ADMISSION DATE', 'Admission Date'));
            const dob            = normalizeDate(col(row, 'DATE OF BIRTH', 'Date of Birth', 'DOB'));
            const gender         = normalizeGender(col(row, 'GENDER ', 'GENDER', 'Gender'));
            const fatherName     = String(col(row, 'FATHER NAME ', 'FATHER NAME', 'Father Name') || '').trim();
            const motherName     = String(col(row, 'MOTHER NAME ', 'MOTHER NAME', 'Mother Name') || '').trim();
            const address        = String(col(row, 'ADDRESS', 'Address') || '').trim();
            const nationality    = String(col(row, 'NATIONALITY', 'Nationality') || 'Indian').trim();
            const religionCaste  = String(col(row, 'RELIGION CASTE AND CATEGORY', 'Category') || '').trim();
            const lastSchool     = String(col(row, 'INSTITUTION STUDIED ', 'INSTITUTION STUDIED') || '').trim();
            const tcNo           = String(col(row, 'Transfer Certificate Number\r\n', 'Transfer Certificate No') || '').trim();
            const tcDate         = normalizeDate(col(row, 'Transfer Certificate\r\n Date ', 'Transfer Certificate Date'));

            const safeId = collegeId.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            let email = `${safeId}@sdcpuk.edu.in`;

            const remarks = [
                regNo     ? `Reg: ${regNo}`      : '',
                tcNo      ? `TC: ${tcNo}`        : '',
                phone2    ? `Alt: ${phone2}`      : '',
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
                        ...(religionCaste && { religion: religionCaste }),
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
                            userDoc.email = `${safeId}${rowNum}@sdcpuk.edu.in`;
                            student = await User.create(userDoc);
                            console.log(`  Row ${rowNum}: Email collision, used ${userDoc.email}`);
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
            }

            // --- Enroll in Batch ---
            if (!isDryRun) {
                await Batch.updateOne(
                    { _id: batch._id, 'enrolledStudents.student': { $ne: student._id } },
                    { $push: { enrolledStudents: { student: student._id, enrolledAt: admissionDate || new Date(), status: 'active' } } }
                );
            }
            stats.enrolled++;

            // ===================================================================
            // FEE LEDGER RECONCILIATION
            // ===================================================================
            const feeRecord = feeMap.get(collegeId);
            const fixation  = (feeRecord && feeRecord.fixation) ? feeRecord.fixation : normalizeNumber(col(row, 'Fixation', 'Total Fee'));
            const paidSheet = (feeRecord && feeRecord.paid) ? feeRecord.paid : normalizeNumber(col(row, 'Paid'));

            const installments = [];
            let totalPaid = 0;

            // Use parsed installments from feeRecord if available
            if (feeRecord && feeRecord.installments && feeRecord.installments.length > 0) {
                for (const inst of feeRecord.installments) {
                    const paidOn = inst.date || admissionDate || new Date();
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: inst.amount,
                        dueDate: paidOn,
                        paidDate: paidOn,
                        status: 'paid',
                        paymentMethod: 'cash',
                        notes: `Installment #${inst.num} — imported`
                    });
                    totalPaid += inst.amount;
                }
            } else {
                // Fallback to row fields in student sheet
                const allKeys = Object.keys(row);
                for (let k = 1; k <= 10; k++) {
                    const amtKey = allKeys.find(key =>
                        new RegExp(`^${k}(st|nd|rd|th)?\\s*install`, 'i').test(key.trim())
                    );
                    if (!amtKey) continue;
                    const amt = normalizeNumber(row[amtKey]);
                    if (amt <= 0) continue;

                    const dateKey = allKeys[allKeys.indexOf(amtKey) + 1];
                    const paidOn = normalizeDate(dateKey ? row[dateKey] : null) || admissionDate || new Date();

                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: amt,
                        dueDate: paidOn,
                        paidDate: paidOn,
                        status: 'paid',
                        paymentMethod: 'cash',
                        notes: `Installment #${k} — imported`
                    });
                    totalPaid += amt;
                }
            }

            const effectivePaid = totalPaid > 0 ? totalPaid : paidSheet;

            // If neither fixation nor paid exists, skip
            if (fixation <= 0 && effectivePaid <= 0) {
                stats.feeSkipped++;
            } else {
                // If fixation is empty/0 but student has paid, set total to paid amount
                const finalTotal = fixation > 0 ? fixation : effectivePaid;
                const balance = Math.max(0, finalTotal - effectivePaid);

                if (balance > 0) {
                    installments.push({
                        _id: new mongoose.Types.ObjectId(),
                        amount: Math.round(balance * 100) / 100,
                        dueDate: session.endDate || new Date('2027-03-31'),
                        status: 'pending',
                        notes: 'Remaining balance — imported'
                    });
                }

                // Auto-balance rounding gap for pre-save hook
                const instTotal = installments.reduce((s, x) => s + x.amount, 0);
                if (Math.abs(instTotal - finalTotal) > 0.01 && installments.length > 0) {
                    installments[installments.length - 1].amount += (finalTotal - instTotal);
                }

                if (!isDryRun) {
                    const exists = await Fee.findOne({ institute: inst._id, student: student._id, batch: batch._id, deletedAt: null });
                    if (!exists) {
                        await Fee.create({
                            institute: inst._id,
                            student: student._id,
                            batch: batch._id,
                            session: session._id,
                            totalAmount: finalTotal,
                            paidAmount: effectivePaid,
                            balanceAmount: balance,
                            status: balance <= 0 ? 'paid' : effectivePaid > 0 ? 'partial' : 'not_started',
                            installments
                        });
                        stats.fees++;
                    } else if (exists.paidAmount === 0 && effectivePaid > 0) {
                        exists.totalAmount = Math.max(exists.totalAmount, finalTotal);
                        exists.paidAmount = effectivePaid;
                        exists.balanceAmount = Math.max(0, exists.totalAmount - effectivePaid);
                        exists.status = exists.balanceAmount <= 0 ? 'paid' : 'partial';
                        exists.installments = installments;
                        await exists.save();
                        stats.fees++;
                    }
                } else {
                    stats.fees++;
                }
            }

        } catch (err) {
            const id = String(rawRows[i]?.['COLLEGE ID '] || rawRows[i]?.['COLLEGE ID'] || '').trim();
            stats.errors.push(`Row ${rowNum} (${id}): ${err.message}`);
            console.error(`  ❌ Row ${rowNum} ${id}: ${err.message}`);
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
    console.log(`Skipped (empty)   : ${stats.skipped}`);
    console.log(`Students Created  : ${stats.created}`);
    console.log(`Students Existing : ${stats.existing}`);
    console.log(`Enrollments       : ${stats.enrolled}`);
    console.log(`Batches Created   : ${stats.batchesCreated}`);
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
        console.log('\n✅ Login credentials for imported students:');
        console.log(`   Email    : <collegeid_lowercase>@sdcpuk.edu.in`);
        console.log(`   Password : Student@123`);
        console.log(`   Example  : 2025klpu002@sdcpuk.edu.in / Student@123`);
    }
    console.log('');

    await mongoose.disconnect();
    process.exit(stats.errors.length > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
