const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION SCHEMA FOR PU COLLEGE (SDC Independent PU College)
// ============================================================================

const STRUCTURE_BLUEPRINT = {
    departments: [
        { name: "Commerce Department", code: "COMMERCE", description: "Commerce & Management Studies (EBACS, EBAS)" },
        { name: "Science Department", code: "SCIENCE", description: "Science & Technology Studies (PCMB, PCMCS)" }
    ],
    // Academic hierarchy:
    // Level 1: Years (1st PUC / 1st Year, 2nd PUC / 2nd Year)
    // Level 2: Stream Combinations (EBACS, EBAS, PCMB, PCMCS)
    // Level 3: Sections under each combination (M1-M4 for Commerce, S1 A - S1 B for Science)
    classes: [
        // --- 1st Year (I PUC) ---
        {
            name: "I PUC EBACS",
            code: "1EBACS",
            departmentCode: "COMMERCE",
            sections: ["M1", "M2", "M3", "M4"],
            description: "Economics, Business Studies, Accountancy, Computer Science (1st Year)"
        },
        {
            name: "I PUC EBAS",
            code: "1EBAS",
            departmentCode: "COMMERCE",
            sections: ["M1", "M2", "M3", "M4"],
            description: "Economics, Business Studies, Accountancy, Statistics (1st Year)"
        },
        {
            name: "I PUC PCMB",
            code: "1PCMB",
            departmentCode: "SCIENCE",
            sections: ["S1 A", "S1 B"],
            description: "Physics, Chemistry, Mathematics, Biology (1st Year)"
        },
        {
            name: "I PUC PCMCS",
            code: "1PCMCS",
            departmentCode: "SCIENCE",
            sections: ["S1 A", "S1 B"],
            description: "Physics, Chemistry, Mathematics, Computer Science (1st Year)"
        },

        // --- 2nd Year (II PUC) ---
        {
            name: "II PUC EBACS",
            code: "2EBACS",
            departmentCode: "COMMERCE",
            sections: ["M1", "M2", "M3", "M4"],
            description: "Economics, Business Studies, Accountancy, Computer Science (2nd Year)"
        },
        {
            name: "II PUC EBAS",
            code: "2EBAS",
            departmentCode: "COMMERCE",
            sections: ["M1", "M2", "M3", "M4"],
            description: "Economics, Business Studies, Accountancy, Statistics (2nd Year)"
        },
        {
            name: "II PUC PCMB",
            code: "2PCMB",
            departmentCode: "SCIENCE",
            sections: ["S1 A", "S1 B"],
            description: "Physics, Chemistry, Mathematics, Biology (2nd Year)"
        },
        {
            name: "II PUC PCMCS",
            code: "2PCMCS",
            departmentCode: "SCIENCE",
            sections: ["S1 A", "S1 B"],
            description: "Physics, Chemistry, Mathematics, Computer Science (2nd Year)"
        }
    ]
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function normalizeDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    if (typeof val === 'number') {
        // Excel serial date format (days since Dec 30 1899)
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    if (typeof val === 'string') {
        const cleaned = val.trim();
        if (!cleaned) return null;
        // Handle DD/MM/YYYY, DD-MM-YYYY
        const ddmmyyyy = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddmmyyyy) {
            return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
        }
        const parsed = new Date(cleaned);
        if (!isNaN(parsed)) return parsed;
    }
    return null;
}

function normalizeNumber(val, defaultVal = 0) {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const str = String(val).replace(/,/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? defaultVal : num;
}

function parseName(fullName) {
    if (!fullName) return { firstName: "Student", lastName: "" };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1]
    };
}

function normalizeGender(g) {
    if (!g) return 'Male';
    const lower = String(g).trim().toLowerCase();
    if (lower.startsWith('f')) return 'Female';
    if (lower.startsWith('m')) return 'Male';
    return 'Other';
}

// ============================================================================
// MAIN ONBOARDING RUNNER
// ============================================================================

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isSetupOnly = args.includes('--setup-only');
    
    let instituteCode = 'SDCPUK';
    const instIdx = args.indexOf('--institute');
    if (instIdx !== -1 && args[instIdx + 1]) {
        instituteCode = args[instIdx + 1].toUpperCase();
    }

    let sessionName = '2026-27';
    const sessIdx = args.indexOf('--session');
    if (sessIdx !== -1 && args[sessIdx + 1]) {
        sessionName = args[sessIdx + 1];
    }

    let filePath = null;
    const fileIdx = args.indexOf('--file');
    if (fileIdx !== -1 && args[fileIdx + 1]) {
        filePath = path.resolve(args[fileIdx + 1]);
    }

    console.log("=================================================================");
    console.log("   SDC INDEPENDENT PU COLLEGE - STRUCTURE & DATA ONBOARDING     ");
    console.log("=================================================================");
    console.log(`Institute Code : ${instituteCode}`);
    console.log(`Active Session : ${sessionName}`);
    console.log(`Mode           : ${isDryRun ? 'DRY-RUN (No writes)' : 'LIVE EXECUTION'}`);
    console.log(`Scope          : ${isSetupOnly ? 'Setup Structure Only' : (filePath ? `Ingest from ${filePath}` : 'Setup Structure + Await File')}`);
    console.log("-----------------------------------------------------------------");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("ERROR: MONGODB_URI is not defined in .env.local");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.\n");

    // Dynamic model loaders
    const Institute = mongoose.models.Institute || (await import('../models/Institute.js')).default;
    const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
    const Department = mongoose.models.Department || (await import('../models/Department.js')).default;
    const Course = mongoose.models.Course || (await import('../models/Course.js')).default;
    const Batch = mongoose.models.Batch || (await import('../models/Batch.js')).default;
    const User = mongoose.models.User || (await import('../models/User.js')).default;
    const Fee = mongoose.models.Fee || (await import('../models/Fee.js')).default;
    const Membership = mongoose.models.Membership || (await import('../models/Membership.js')).default;

    // 1. Resolve Target Institute
    let inst = await Institute.findOne({ code: instituteCode, deletedAt: null });
    if (!inst) {
        console.warn(`Institute with code ${instituteCode} not found in this database.`);
        if (isDryRun) {
            console.log(`[DRY-RUN] Would create Institute: SDC Independent PU College (${instituteCode})`);
            inst = { _id: new mongoose.Types.ObjectId(), name: "SDC Independent PU College", code: instituteCode, type: "COLLEGE" };
        } else {
            console.log(`Creating Institute: SDC Independent PU College (${instituteCode})...`);
            inst = await Institute.create({
                name: "SDC Independent PU College",
                code: instituteCode,
                type: "COLLEGE",
                status: "active",
                contactEmail: "info@sdcpuk.edu.in",
                contactPhone: "9900000000",
                settings: {
                    structure: "CLASS_BASED",
                    timezone: "Asia/Kolkata",
                    currency: "INR"
                }
            });
            console.log(`Created Institute with ID: ${inst._id}`);
        }
    } else {
        console.log(`Found Institute: "${inst.name}" (${inst.code}) [Type: ${inst.type}]`);
        if (!inst.settings || inst.settings.structure !== 'CLASS_BASED') {
            console.log(`Updating institute structure to 'CLASS_BASED' for PU College...`);
            if (!isDryRun) {
                inst.settings = { ...(inst.settings || {}), structure: 'CLASS_BASED' };
                await inst.save();
            }
        }
    }

    // Resolve an Admin Actor ID for audit / createdBy
    let adminUser = await User.findOne({ 
        $or: [
            { institute: inst._id, role: { $in: ['admin', 'super_admin'] } },
            { role: 'super_admin' }
        ],
        deletedAt: null 
    });
    if (!adminUser) {
        adminUser = await User.findOne({ role: 'super_admin' });
    }
    const actorId = adminUser?._id || new mongoose.Types.ObjectId();

    // 2. Resolve Active Session
    let activeSession = await Session.findOne({
        $or: [{ instituteId: inst._id }, { institute: inst._id }],
        sessionName: sessionName,
        deletedAt: null
    });

    if (!activeSession) {
        console.log(`Session "${sessionName}" not found. Creating session...`);
        if (!isDryRun) {
            // Deactivate existing sessions
            await Session.updateMany(
                { $or: [{ instituteId: inst._id }, { institute: inst._id }] },
                { $set: { isActive: false } }
            );
            activeSession = await Session.create({
                sessionName: sessionName,
                instituteId: inst._id,
                startDate: new Date('2026-06-01'),
                endDate: new Date('2027-03-31'),
                isActive: true
            });
            console.log(`Created and activated session "${sessionName}" (${activeSession._id})`);
        } else {
            activeSession = { _id: new mongoose.Types.ObjectId(), sessionName, isActive: true, startDate: new Date('2026-06-01'), endDate: new Date('2027-03-31') };
        }
    } else {
        console.log(`Found Active Session: "${activeSession.sessionName}" (${activeSession._id})`);
    }

    // 3. Setup Departments
    console.log("\n--- Configuring Academic Departments ---");
    const deptMap = new Map(); // code -> _id
    for (const d of STRUCTURE_BLUEPRINT.departments) {
        let dept = await Department.findOne({ institute: inst._id, code: d.code, deletedAt: null });
        if (!dept) {
            console.log(`Creating Department: ${d.name} (${d.code})`);
            if (!isDryRun) {
                dept = await Department.create({
                    institute: inst._id,
                    name: d.name,
                    code: d.code,
                    description: d.description,
                    isActive: true
                });
            } else {
                dept = { _id: new mongoose.Types.ObjectId(), code: d.code, name: d.name };
            }
        } else {
            console.log(`Department exists: ${dept.name} (${dept.code})`);
        }
        deptMap.set(d.code, dept._id);
    }

    // 4. Setup Classes (Courses) and Sections (Batches)
    console.log("\n--- Configuring Classes & Sections ---");
    const courseMap = new Map(); // normalizedName -> doc
    const batchMap = new Map();  // `${courseId}_${normalizedSectionName}` -> doc

    for (const classCfg of STRUCTURE_BLUEPRINT.classes) {
        let course = await Course.findOne({
            institute: inst._id,
            $or: [{ code: classCfg.code }, { name: classCfg.name }],
            deletedAt: null
        });

        if (!course) {
            console.log(`Creating Class (Course): ${classCfg.name} [Code: ${classCfg.code}]`);
            if (!isDryRun) {
                course = await Course.create({
                    institute: inst._id,
                    name: classCfg.name,
                    code: classCfg.code,
                    description: classCfg.description,
                    department: deptMap.get(classCfg.departmentCode) || null,
                    duration: { value: 12, unit: 'months' },
                    fees: { amount: 0, currency: 'INR' },
                    collegeConfig: {
                        totalSemesters: 2,
                        billingCycle: 'YEARLY'
                    },
                    createdBy: actorId
                });
            } else {
                course = { _id: new mongoose.Types.ObjectId(), name: classCfg.name, code: classCfg.code };
            }
        } else {
            console.log(`Class exists: ${course.name} [Code: ${course.code}]`);
        }

        courseMap.set(classCfg.name.toUpperCase().trim(), course);
        // Also map standard shorthand (e.g., "II PUC EBACS" -> course)
        courseMap.set(classCfg.code.toUpperCase().trim(), course);

        // Sections for this class
        for (const secName of classCfg.sections) {
            const batchKey = `${course._id.toString()}_${secName.toUpperCase().trim()}`;
            let batch = await Batch.findOne({
                institute: inst._id,
                course: course._id,
                session: activeSession._id,
                name: secName,
                deletedAt: null
            });

            if (!batch) {
                console.log(`  └─ Creating Section (Batch): ${secName} under ${classCfg.name}`);
                if (!isDryRun) {
                    batch = await Batch.create({
                        institute: inst._id,
                        course: course._id,
                        session: activeSession._id,
                        name: secName,
                        capacity: 80,
                        schedule: {
                            startDate: activeSession.startDate || new Date('2026-06-01'),
                            endDate: activeSession.endDate || new Date('2027-03-31')
                        },
                        createdBy: actorId,
                        enrolledStudents: []
                    });
                } else {
                    batch = { _id: new mongoose.Types.ObjectId(), name: secName, course: course._id, session: activeSession._id, enrolledStudents: [] };
                }
            } else {
                console.log(`  └─ Section exists: ${batch.name} (${batch.enrolledStudents?.length || 0} students)`);
            }

            batchMap.set(batchKey, batch);
        }
    }

    if (isSetupOnly) {
        console.log("\n Academic structure setup completed successfully!");
        process.exit(0);
    }

    // 5. Ingest Students & Fees if Excel file is provided
    if (!filePath) {
        console.log("\nℹ️  No --file argument provided. Structure is ready.");
        console.log("To ingest students and fees from Excel, run:");
        console.log(`node scripts/onboard-pu-college.js --file "/path/to/II PUC DETAILS 2026-27.xlsx" [--dry-run]\n`);
        process.exit(0);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`\n❌ ERROR: File does not exist at path: ${filePath}`);
        process.exit(1);
    }

    console.log(`\n=================================================================`);
    console.log(`   PARSING AND INGESTING EXCEL DATA: ${path.basename(filePath)}   `);
    console.log(`=================================================================`);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read with defval to preserve empty columns
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`Loaded Sheet: "${sheetName}" with ${rawRows.length} total rows.\n`);

    let stats = {
        totalRows: rawRows.length,
        processed: 0,
        skipped: 0,
        createdStudents: 0,
        updatedStudents: 0,
        enrolled: 0,
        feesCreated: 0,
        errors: []
    };

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowIdx = i + 2; // Excel 1-based + header

        // Extract key identifiers
        const collegeId = String(row['COLLEGE ID'] || row['College ID'] || row['COLLEGE_ID'] || '').trim();
        const studentName = String(row['NAME'] || row['Student Name'] || row['Name'] || '').trim();
        const rawClass = String(row['Class of Admission'] || row['CLASS OF ADMISSION'] || row['Class'] || '').trim();
        const rawSection = String(row['Section'] || row['SECTION'] || row['Sec'] || '').trim();

        if (!studentName && !collegeId) {
            // Empty row
            stats.skipped++;
            continue;
        }

        stats.processed++;

        // Resolve Target Course
        let targetCourse = courseMap.get(rawClass.toUpperCase().trim());
        if (!targetCourse) {
            // Try fuzzy match (e.g. "II PUC EBACS" inside string)
            for (const [key, c] of courseMap.entries()) {
                if (rawClass.toUpperCase().includes(key) || key.includes(rawClass.toUpperCase())) {
                    targetCourse = c;
                    break;
                }
            }
        }

        if (!targetCourse) {
            stats.errors.push(`Row ${rowIdx}: Cannot match Class "${rawClass}" for student "${studentName}" (${collegeId})`);
            continue;
        }

        // Resolve Target Batch (Section)
        const batchKey = `${targetCourse._id.toString()}_${rawSection.toUpperCase().trim()}`;
        let targetBatch = batchMap.get(batchKey);
        if (!targetBatch) {
            // If section doesn't exist yet, auto-create it under this course
            console.log(`Row ${rowIdx}: Creating new section "${rawSection}" under ${targetCourse.name}...`);
            if (!isDryRun) {
                targetBatch = await Batch.create({
                    institute: inst._id,
                    course: targetCourse._id,
                    session: activeSession._id,
                    name: rawSection.trim(),
                    capacity: 80,
                    schedule: {
                        startDate: activeSession.startDate || new Date('2026-06-01'),
                        endDate: activeSession.endDate || new Date('2027-03-31')
                    },
                    createdBy: actorId,
                    enrolledStudents: []
                });
            } else {
                targetBatch = { _id: new mongoose.Types.ObjectId(), name: rawSection.trim(), enrolledStudents: [] };
            }
            batchMap.set(batchKey, targetBatch);
        }

        // Student Demographics
        const { firstName, lastName } = parseName(studentName);
        const contactNumber = String(row['Contact Number'] || row['Contact'] || row['Phone'] || '').replace(/\D/g, '').slice(-10);
        const satsNo = String(row['SATS NO'] || row['SATS NO.'] || row['SATS'] || '').trim();
        const admissionNo = String(row['ADMISSION NO.'] || row['ADMISSION NO'] || row['Admission No'] || '').trim();
        const admissionDate = normalizeDate(row['ADMISSION DATE'] || row['Admission Date']);
        const dob = normalizeDate(row['DATE OF BIRTH'] || row['Date of Birth'] || row['DOB']);
        const gender = normalizeGender(row['GENDER'] || row['Gender']);
        const fatherName = String(row['FATHER NAME'] || row['Father Name'] || '').trim();
        const motherName = String(row['MOTHER NAME'] || row['Mother Name'] || '').trim();
        const address = String(row['ADDRESS'] || row['Address'] || '').trim();
        const placeOfBirth = String(row['PLACE OF BIRTH'] || row['Place of Birth'] || '').trim();
        const nationality = String(row['NATIONALITY'] || row['Nationality'] || 'Indian').trim();
        const religionCaste = String(row['RELIGION CASTE AND CATEGORY'] || row['Category'] || '').trim();
        const lastSchool = String(row['INSTITUTION STUDIED'] || row['Previous School'] || '').trim();
        const regNo = String(row['REG . NO'] || row['REG NO'] || row['Reg No'] || '').trim();
        const tcDetails = String(row['Transfer Certificate No/Date'] || row['TC'] || '').trim();

        // Unique email generation (deterministic if not provided)
        const safeId = collegeId ? collegeId.replace(/[^A-Za-z0-9]/g, '').toLowerCase() : `stu${admissionNo || stats.processed}`;
        const studentEmail = `${safeId}@sdcpuk.edu.in`;

        // Check if student exists
        let student = null;
        if (collegeId) {
            student = await User.findOne({ institute: inst._id, enrollmentNumber: collegeId, deletedAt: null });
        }
        if (!student && admissionNo) {
            student = await User.findOne({ institute: inst._id, grNumber: admissionNo, deletedAt: null });
        }
        if (!student) {
            student = await User.findOne({ institute: inst._id, email: studentEmail, deletedAt: null });
        }

        if (!student) {
            if (isDryRun) {
                stats.createdStudents++;
                student = { _id: new mongoose.Types.ObjectId(), enrollmentNumber: collegeId, email: studentEmail };
            } else {
                student = await User.create({
                    institute: inst._id,
                    role: 'student',
                    email: studentEmail,
                    passwordHash: '$2a$10$X87fB98j9rB8k7J2B8p0e.wN8oY5A1kXfN3Z1/8X8v.Q2sL9A7B6W', // default pass
                    enrollmentNumber: collegeId || undefined,
                    grNumber: admissionNo || undefined,
                    statsNo: satsNo || undefined,
                    admissionDate: admissionDate || activeSession.startDate,
                    admissionStd: targetCourse.name,
                    fatherName: fatherName,
                    motherName: motherName,
                    nationality: nationality,
                    religion: religionCaste,
                    placeOfBirth: { city: placeOfBirth },
                    lastSchoolAttended: lastSchool,
                    remarks: [regNo ? `Reg No: ${regNo}` : '', tcDetails ? `TC: ${tcDetails}` : ''].filter(Boolean).join(' | '),
                    profile: {
                        firstName: firstName,
                        lastName: lastName,
                        phone: contactNumber || undefined,
                        gender: gender,
                        dob: dob || undefined,
                        address: { street: address }
                    },
                    guardianDetails: {
                        name: fatherName || motherName || 'Parent',
                        phone: contactNumber || undefined,
                        relation: fatherName ? 'father' : 'mother'
                    },
                    activeSession: activeSession._id,
                    activeSessions: [activeSession._id]
                });

                await Membership.create({
                    user: student._id,
                    institute: inst._id,
                    role: 'student',
                    isActive: true
                });
                stats.createdStudents++;
            }
        } else {
            stats.updatedStudents++;
        }

        // Enroll Student into Target Batch
        if (!isDryRun) {
            const alreadyEnrolled = targetBatch.enrolledStudents.some(
                e => e.student && e.student.toString() === student._id.toString()
            );
            if (!alreadyEnrolled) {
                targetBatch.enrolledStudents.push({
                    student: student._id,
                    enrolledAt: admissionDate || new Date(),
                    status: 'active'
                });
                await targetBatch.save();
                stats.enrolled++;
            }
        } else {
            stats.enrolled++;
        }

        // ====================================================================
        // FEE FIXATION & INSTALLMENT HISTORICAL RECONCILIATION
        // ====================================================================
        const fixation = normalizeNumber(row['Fixation'] || row['FIXATION'] || row['Total Fee']);
        const paidInSheet = normalizeNumber(row['Paid'] || row['PAID']);
        const balanceInSheet = normalizeNumber(row['Balance'] || row['BALANCE']);

        if (fixation > 0) {
            const installments = [];
            let totalInstallmentsPaid = 0;

            // Check up to 10 installments
            for (let k = 1; k <= 10; k++) {
                const amountCol = `${k}${getOrdinalSuffix(k)} Installment`;
                const dateCol = `Date_${k}` in row ? `Date_${k}` : `Date`; // check exact header
                // Find column by regex if needed
                const matchedAmtKey = Object.keys(row).find(key => 
                    new RegExp(`^${k}(st|nd|rd|th)?\\s*Installment`, 'i').test(key.trim())
                );
                
                if (matchedAmtKey) {
                    const instAmount = normalizeNumber(row[matchedAmtKey]);
                    if (instAmount > 0) {
                        // Find corresponding date column (often adjacent or named Date)
                        const matchedDateKey = Object.keys(row).find(key => 
                            new RegExp(`^Date.*${k}`, 'i').test(key.trim()) || 
                            (key.toLowerCase().includes('date') && Object.keys(row).indexOf(key) === Object.keys(row).indexOf(matchedAmtKey) + 1)
                        );
                        const instDate = normalizeDate(matchedDateKey ? row[matchedDateKey] : null) || admissionDate || new Date();

                        installments.push({
                            _id: new mongoose.Types.ObjectId(),
                            amount: instAmount,
                            dueDate: instDate,
                            paidDate: instDate,
                            status: 'paid',
                            paymentMethod: 'cash',
                            notes: `Historical installment #${k} ingested from Excel ledger`
                        });
                        totalInstallmentsPaid += instAmount;
                    }
                }
            }

            // Calculate pending balance
            const effectivePaid = totalInstallmentsPaid > 0 ? totalInstallmentsPaid : paidInSheet;
            const remainingBalance = Math.max(0, fixation - effectivePaid);

            if (remainingBalance > 0) {
                installments.push({
                    _id: new mongoose.Types.ObjectId(),
                    amount: Math.round(remainingBalance * 100) / 100,
                    dueDate: activeSession.endDate || new Date('2027-03-31'),
                    status: 'pending',
                    notes: 'Remaining balance from fee fixation'
                });
            }

            // Create or update Fee document
            if (!isDryRun) {
                let feeDoc = await Fee.findOne({
                    institute: inst._id,
                    student: student._id,
                    batch: targetBatch._id,
                    deletedAt: null
                });

                if (!feeDoc) {
                    await Fee.create({
                        institute: inst._id,
                        student: student._id,
                        batch: targetBatch._id,
                        session: activeSession._id,
                        totalAmount: fixation,
                        paidAmount: effectivePaid,
                        balanceAmount: remainingBalance,
                        status: remainingBalance === 0 ? 'paid' : (effectivePaid > 0 ? 'partial' : 'not_started'),
                        installments: installments
                    });
                    stats.feesCreated++;
                }
            } else {
                stats.feesCreated++;
            }
        }
    }

    console.log("\n=================================================================");
    console.log("                   INGESTION SUMMARY REPORT                     ");
    console.log("=================================================================");
    console.log(`Total Rows in Sheet  : ${stats.totalRows}`);
    console.log(`Processed Rows       : ${stats.processed}`);
    console.log(`Skipped (Empty)      : ${stats.skipped}`);
    console.log(`Students Created     : ${stats.createdStudents}`);
    console.log(`Students Existing    : ${stats.updatedStudents}`);
    console.log(`Batch Enrollments    : ${stats.enrolled}`);
    console.log(`Fee Records Created  : ${stats.feesCreated}`);
    if (stats.errors.length > 0) {
        console.log(`Validation Errors (${stats.errors.length}):`);
        stats.errors.slice(0, 10).forEach(e => console.log(`  ❌ ${e}`));
        if (stats.errors.length > 10) {
            console.log(`  ... and ${stats.errors.length - 10} more`);
        }
    }
    console.log("=================================================================\n");

    process.exit(0);
}

function getOrdinalSuffix(i) {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
}

run().catch(err => {
    console.error("FATAL ERROR in onboarding runner:", err);
    process.exit(1);
});
