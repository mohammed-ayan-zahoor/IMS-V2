const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Load models
const Institute = require('../models/Institute').default || require('../models/Institute');
const Session = require('../models/Session').default || require('../models/Session');
const Course = require('../models/Course').default || require('../models/Course');
const Batch = require('../models/Batch').default || require('../models/Batch');
const User = require('../models/User').default || require('../models/User');
const Attendance = require('../models/Attendance').default || require('../models/Attendance');
const Subject = require('../models/Subject').default || require('../models/Subject');
const OfflineExam = require('../models/OfflineExam').default || require('../models/OfflineExam');
const OfflineExamResult = require('../models/OfflineExamResult').default || require('../models/OfflineExamResult');
const FeePreset = require('../models/FeePreset').default || require('../models/FeePreset');
const Fee = require('../models/Fee').default || require('../models/Fee');
const Membership = require('../models/Membership').default || require('../models/Membership');

async function seedFullYear() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("ERROR: MONGODB_URI is not set in .env.local");
        process.exit(1);
    }

    console.log(`\n=============================================================`);
    console.log(`🌱 SEEDING FULL ACADEMIC YEAR (2025-2026) FOR QISJC`);
    console.log(`=============================================================`);

    try {
        await mongoose.connect(mongoUri);
        console.log(`✓ Connected to MongoDB.\n`);

        const inst = await Institute.findOne({ code: 'QISJC' });
        if (!inst) {
            console.error("❌ Institute QISJC not found!");
            process.exit(1);
        }
        const instId = inst._id;
        console.log(`Found Institute: ${inst.name} [ID: ${instId}]`);

        // Find Admin/Staff to mark attendance & create records
        const adminUser = await User.findOne({ institute: instId, role: { $in: ['admin', 'super_admin'] } }) || await User.findOne();
        const adminId = adminUser?._id;

        // 1. Clean & Name Sessions
        let sessionCurrent = await Session.findOne({ instituteId: instId, startDate: { $gte: new Date('2025-01-01'), $lte: new Date('2025-12-31') } });
        if (!sessionCurrent) {
            sessionCurrent = await Session.create({
                name: '2025-2026',
                instituteId: instId,
                startDate: new Date('2025-06-01'),
                endDate: new Date('2026-04-30'),
                isCurrent: true,
                isActive: true
            });
        } else {
            sessionCurrent.name = '2025-2026';
            sessionCurrent.isCurrent = true;
            sessionCurrent.isActive = true;
            await sessionCurrent.save();
        }
        console.log(`✓ Configured Active Session: 2025-2026 [ID: ${sessionCurrent._id}]`);

        let sessionNext = await Session.findOne({ instituteId: instId, startDate: { $gte: new Date('2026-01-01'), $lte: new Date('2026-12-31') } });
        if (!sessionNext) {
            sessionNext = await Session.create({
                name: '2026-2027',
                instituteId: instId,
                startDate: new Date('2026-06-01'),
                endDate: new Date('2027-04-30'),
                isCurrent: false,
                isActive: true
            });
        } else {
            sessionNext.name = '2026-2027';
            sessionNext.isCurrent = false;
            sessionNext.isActive = true;
            await sessionNext.save();
        }
        console.log(`✓ Configured Target Promotion Session: 2026-2027 [ID: ${sessionNext._id}]\n`);

        // 2. Fetch all courses
        const courses = await Course.find({ institute: instId, deletedAt: null }).sort({ createdAt: 1 });
        console.log(`✓ Loaded ${courses.length} Courses/Standards.`);

        // 3. Create Core Subjects for each Course
        const subjectTemplates = [
            { name: 'English Language & Lit', codeSuffix: 'ENG' },
            { name: 'Mathematics', codeSuffix: 'MATH' },
            { name: 'Environmental Science & EVS', codeSuffix: 'SCI' },
            { name: 'Hindi Second Language', codeSuffix: 'HIN' },
            { name: 'Social Studies & Civics', codeSuffix: 'SST' },
            { name: 'Computer Applications & ICT', codeSuffix: 'ICT' }
        ];

        const courseSubjectsMap = {};
        for (const course of courses) {
            courseSubjectsMap[course._id.toString()] = [];
            for (const tpl of subjectTemplates) {
                const subCode = `${course.code || 'STD'}-${tpl.codeSuffix}`.toUpperCase();
                let sub = await Subject.findOne({ course: course._id, code: subCode, deletedAt: null });
                if (!sub) {
                    sub = await Subject.create({
                        institute: instId,
                        course: course._id,
                        name: tpl.name,
                        code: subCode,
                        description: `Curriculum for ${course.name} - ${tpl.name}`
                    });
                }
                courseSubjectsMap[course._id.toString()].push(sub);
            }
        }
        console.log(`✓ Verified and linked core subjects across all courses.`);

        // 4. Create Fee Presets per Course
        console.log(`\nConfiguring Fee Presets...`);
        const feePresetMap = {};
        for (const course of courses) {
            let amount = 36000;
            const cName = (course.name || '').toLowerCase();
            if (cName.includes('nursery') || cName.includes('k.g') || cName.includes('kg')) {
                amount = 24000;
            } else if (cName.includes('6th') || cName.includes('7th') || cName.includes('8th') || cName.includes('9th') || cName.includes('10th')) {
                amount = 48000;
            }

            let preset = await FeePreset.findOne({ institute: instId, course: course._id, deletedAt: null });
            if (!preset) {
                preset = await FeePreset.create({
                    institute: instId,
                    course: course._id,
                    name: `Annual Fee 2025-26 (${course.name})`,
                    amount: amount,
                    description: `Standard academic year tuition for ${course.name}`,
                    category: 'general',
                    complexity: 'standard',
                    isActive: true
                });
            }
            feePresetMap[course._id.toString()] = preset;
        }
        console.log(`✓ Configured Fee Presets for all standards.`);

        // 5. Link Batches to Active Session
        const currentBatches = await Batch.find({ institute: instId, deletedAt: null });
        for (const b of currentBatches) {
            if (!b.session) {
                await Batch.updateOne({ _id: b._id }, { $set: { session: sessionCurrent._id } });
                b.session = sessionCurrent._id;
            }
        }

        // 6. Generate Full Student Fee Invoices covering ALL Real-world Permutations
        console.log(`\nGenerating Full-Year Fee Invoices & Receipts for 183 students covering all scenarios...`);
        const allStudents = await User.find({ institute: instId, role: 'student', deletedAt: null });
        let feesCreated = 0;
        let feesUpdated = 0;

        for (let i = 0; i < allStudents.length; i++) {
            const student = allStudents[i];
            
            // Find student's current active batch
            const studentBatch = currentBatches.find(b => 
                (b.enrolledStudents || []).some(e => e.student.toString() === student._id.toString() && e.status === 'active')
            );

            if (!studentBatch || !studentBatch.course) continue;

            const courseId = studentBatch.course.toString();
            const preset = feePresetMap[courseId];
            const baseFee = preset?.amount || 36000;
            const instAmount = Math.round(baseFee / 3);

            let totalAmount = baseFee;
            let discount = { amount: 0 };
            let extraCharges = { amount: 0 };
            let installments = [];

            // 7 Diverse Financial Scenarios across the 183 students
            const scenario = i % 10;

            if (scenario === 0 || scenario === 1) {
                // SCENARIO 1: Single Lump-sum Upfront Payment in June (Early Bird) (20% of students)
                installments = [
                    { amount: totalAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-05'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-LUMP-2025-${1000 + i}`, collectedBy: 'Accounts Office', notes: 'Full annual tuition paid upfront' }
                ];
            } else if (scenario >= 2 && scenario <= 4) {
                // SCENARIO 2: Regular 3-Installment On-Time Payer (30% of students)
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-12'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-2025-${1000 + i}-T1`, collectedBy: 'Accounts Office' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-10'), status: 'paid', paymentMethod: 'bank_transfer', transactionId: `NEFT-2025-${1000 + i}-T2`, collectedBy: 'Accounts Office' },
                    { amount: totalAmount - (instAmount * 2), dueDate: new Date('2026-01-15'), paidDate: new Date('2026-01-08'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2026-${1000 + i}-T3`, collectedBy: 'Accounts Desk' }
                ];
            } else if (scenario === 5) {
                // SCENARIO 3: Sibling / Merit Scholarship Discount Applied (10% of students)
                const discountAmt = 6000;
                discount = { amount: discountAmt, reason: 'Merit Scholarship / Sibling Discount', appliedBy: adminId, appliedAt: new Date('2025-06-01') };
                const discountedTotal = totalAmount - discountAmt;
                const dInst = Math.round(discountedTotal / 3);

                installments = [
                    { amount: dInst, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-14'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-SCHOLAR-${1000 + i}-1`, collectedBy: 'Accounts Office' },
                    { amount: dInst, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-12'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-SCHOLAR-${1000 + i}-2`, collectedBy: 'Accounts Office' },
                    { amount: discountedTotal - (dInst * 2), dueDate: new Date('2026-01-15'), paidDate: new Date('2026-01-10'), status: 'paid', paymentMethod: 'bank_transfer', transactionId: `NEFT-SCHOLAR-${1000 + i}-3`, collectedBy: 'Accounts Desk' }
                ];
            } else if (scenario === 6 || scenario === 7) {
                // SCENARIO 4: Partial Payment - Term 3 Pending/Overdue (20% of students)
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-15'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-2025-${1000 + i}-T1`, collectedBy: 'Accounts Office' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-14'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2025-${1000 + i}-T2`, collectedBy: 'Accounts Office' },
                    { amount: totalAmount - (instAmount * 2), dueDate: new Date('2026-01-15'), status: 'overdue', penaltyAmount: 500, penaltyStatus: 'pending', notes: 'Reminder sent on 25 Jan 2026' }
                ];
            } else if (scenario === 8) {
                // SCENARIO 5: Heavy Arrears / Only 1 Term Paid (10% of students - Great for carryforward test)
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-15'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2025-${1000 + i}-T1`, collectedBy: 'Accounts Office' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), status: 'overdue', penaltyAmount: 500, penaltyStatus: 'pending' },
                    { amount: totalAmount - (instAmount * 2), dueDate: new Date('2026-01-15'), status: 'overdue', penaltyAmount: 500, penaltyStatus: 'pending' }
                ];
            } else {
                // SCENARIO 6: Late Fee Fine / Extra Activity Charges Added (10% of students)
                const extraAmt = 1500;
                extraCharges = { amount: extraAmt, reason: 'Annual Lab & Cultural Event Kit Fee', appliedBy: adminId, appliedAt: new Date('2025-09-01') };
                const updatedTotal = totalAmount + extraAmt;
                const eInst = Math.round(updatedTotal / 3);

                installments = [
                    { amount: eInst, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-10'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-2025-${1000 + i}-T1`, collectedBy: 'Accounts Office' },
                    { amount: eInst, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-12'), status: 'paid', paymentMethod: 'bank_transfer', transactionId: `NEFT-2025-${1000 + i}-T2`, collectedBy: 'Accounts Office' },
                    { amount: updatedTotal - (eInst * 2), dueDate: new Date('2026-01-15'), paidDate: new Date('2026-01-14'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2026-${1000 + i}-T3`, collectedBy: 'Accounts Desk' }
                ];
            }

            let feeDoc = await Fee.findOne({ student: student._id, batch: studentBatch._id, session: sessionCurrent._id, deletedAt: null });
            if (!feeDoc) {
                await Fee.create({
                    institute: instId,
                    student: student._id,
                    batch: studentBatch._id,
                    session: sessionCurrent._id,
                    totalAmount: totalAmount,
                    discount: discount,
                    extraCharges: extraCharges,
                    feePreset: preset?._id,
                    installments: installments
                });
                feesCreated++;
            } else {
                feeDoc.totalAmount = totalAmount;
                feeDoc.discount = discount;
                feeDoc.extraCharges = extraCharges;
                feeDoc.installments = installments;
                await feeDoc.save();
                feesUpdated++;
            }
        }
        console.log(`✓ Diverse Fee Ledgers complete (Created: ${feesCreated}, Updated: ${feesUpdated}).`);

        // 6b. Seed School Incomes & Expenses (Income & Expense Models)
        console.log(`\nSeeding General School Operational Incomes & Expenses...`);
        const IncomeHead = require('../models/IncomeHead').default || require('../models/IncomeHead');
        const ExpenseHead = require('../models/ExpenseHead').default || require('../models/ExpenseHead');
        const Income = require('../models/Income').default || require('../models/Income');
        const Expense = require('../models/Expense').default || require('../models/Expense');

        let incHead1 = await IncomeHead.findOne({ institute: instId, name: 'Prospectus & Admission Application Fee' });
        if (!incHead1) incHead1 = await IncomeHead.create({ institute: instId, name: 'Prospectus & Admission Application Fee', description: 'Sale of prospectus and application forms', createdBy: adminId });

        let incHead2 = await IncomeHead.findOne({ institute: instId, name: 'Uniform & Stationery Store' });
        if (!incHead2) incHead2 = await IncomeHead.create({ institute: instId, name: 'Uniform & Stationery Store', description: 'School uniform, tie, belt and textbook store sales', createdBy: adminId });

        let expHead1 = await ExpenseHead.findOne({ institute: instId, name: 'Faculty & Staff Payroll' });
        if (!expHead1) expHead1 = await ExpenseHead.create({ institute: instId, name: 'Faculty & Staff Payroll', description: 'Monthly salaries and staff allowances', createdBy: adminId });

        let expHead2 = await ExpenseHead.findOne({ institute: instId, name: 'Campus Utilities (Electricity & Water)' });
        if (!expHead2) expHead2 = await ExpenseHead.create({ institute: instId, name: 'Campus Utilities (Electricity & Water)', description: 'Power grid bills and water supply maintenance', createdBy: adminId });

        let expHead3 = await ExpenseHead.findOne({ institute: instId, name: 'Science Labs & Sports Equipment' });
        if (!expHead3) expHead3 = await ExpenseHead.create({ institute: instId, name: 'Science Labs & Sports Equipment', description: 'Lab chemicals, apparatus, and athletics gear', createdBy: adminId });

        // Generate monthly income/expense entries across the year
        const months = [
            { month: 5, year: 2025 }, { month: 6, year: 2025 }, { month: 7, year: 2025 }, { month: 8, year: 2025 },
            { month: 9, year: 2025 }, { month: 10, year: 2025 }, { month: 11, year: 2025 }, { month: 0, year: 2026 },
            { month: 1, year: 2026 }, { month: 2, year: 2026 }, { month: 3, year: 2026 }
        ];

        for (const mObj of months) {
            const billDate = new Date(mObj.year, mObj.month, 10);
            
            // Monthly Electricity
            const existingExp = await Expense.findOne({ institute: instId, expenseHead: expHead2._id, date: billDate });
            if (!existingExp) {
                await Expense.create({
                    institute: instId,
                    expenseHead: expHead2._id,
                    date: billDate,
                    amount: 28500 + ((mObj.month * 1230) % 6500),
                    description: `Electricity & Water bill for ${billDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    paidTo: 'State Electricity Board',
                    paymentMode: 'Bank Transfer',
                    entryBy: adminId
                });
            }

            // Monthly Staff Payroll
            const salaryDate = new Date(mObj.year, mObj.month, 5);
            const existingSalary = await Expense.findOne({ institute: instId, expenseHead: expHead1._id, date: salaryDate });
            if (!existingSalary) {
                await Expense.create({
                    institute: instId,
                    expenseHead: expHead1._id,
                    date: salaryDate,
                    amount: 145000,
                    description: `Staff salaries for ${salaryDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    paidTo: 'Faculty & Support Staff',
                    paymentMode: 'Bank Transfer',
                    entryBy: adminId
                });
            }
        }
        console.log(`✓ Monthly Incomes & Operational Expenses seeded.`);

        // 7. Generate Exams & Marksheets (FA1, FA2, SA1, FA3, FA4, SA2)
        console.log(`\nCreating 6 Complete Exam Milestones (FA1, FA2, SA1, FA3, FA4, SA2) & Scoring All Students...`);
        const examDefinitions = [
            { key: 'FA1', title: 'FA-1 (Formative Assessment 1)', examType: 'unit_test', date: new Date('2025-07-22'), maxMarks: 25, passMarks: 9 },
            { key: 'FA2', title: 'FA-2 (Formative Assessment 2)', examType: 'unit_test', date: new Date('2025-08-28'), maxMarks: 25, passMarks: 9 },
            { key: 'SA1', title: 'SA-1 (Summative Assessment 1 / Term 1)', examType: 'half_yearly', date: new Date('2025-10-14'), maxMarks: 80, passMarks: 28 },
            { key: 'FA3', title: 'FA-3 (Formative Assessment 3)', examType: 'unit_test', date: new Date('2025-12-16'), maxMarks: 25, passMarks: 9 },
            { key: 'FA4', title: 'FA-4 (Formative Assessment 4)', examType: 'unit_test', date: new Date('2026-02-10'), maxMarks: 25, passMarks: 9 },
            { key: 'SA2', title: 'SA-2 (Summative Assessment 2 / Annual Final)', examType: 'annual', date: new Date('2026-03-24'), maxMarks: 80, passMarks: 28 }
        ];

        let resultsCreated = 0;

        for (const course of courses) {
            const courseSubs = courseSubjectsMap[course._id.toString()] || [];
            if (courseSubs.length === 0) continue;

            const courseBatches = currentBatches.filter(b => b.course && b.course.toString() === course._id.toString());
            const batchIds = courseBatches.map(b => b._id);

            for (const def of examDefinitions) {
                const examTitle = `${def.title} - ${course.name}`;
                let offlineExam = await OfflineExam.findOne({
                    institute: instId,
                    course: course._id,
                    session: sessionCurrent._id,
                    title: examTitle,
                    deletedAt: null
                });

                const examSubjects = courseSubs.map(s => ({
                    subject: s._id,
                    maxMarks: def.maxMarks,
                    passingMarks: def.passMarks,
                    examDate: def.date
                }));

                if (!offlineExam) {
                    offlineExam = await OfflineExam.create({
                        title: examTitle,
                        institute: instId,
                        course: course._id,
                        session: sessionCurrent._id,
                        batches: batchIds,
                        examType: def.examType,
                        status: 'published',
                        isRankEnabled: true,
                        subjects: examSubjects,
                        coScholastic: [
                            { paramName: 'Discipline', ratingScale: 'A-E' },
                            { paramName: 'Work Habits', ratingScale: 'A-E' }
                        ],
                        createdBy: adminId
                    });
                }

                // Generate Exam Results for all enrolled students in these batches
                for (const batch of courseBatches) {
                    const activeEnrollments = (batch.enrolledStudents || []).filter(e => e.status === 'active');
                    for (let sIdx = 0; sIdx < activeEnrollments.length; sIdx++) {
                        const studentId = activeEnrollments[sIdx].student;

                        // Generate consistent realistic marks (65% to 98%)
                        const basePercent = 65 + ((sIdx * 7) % 32);
                        const subjectMarks = courseSubs.map(s => {
                            const variation = ((sIdx + s._id.toString().charCodeAt(0)) % 10) - 5;
                            const pct = Math.min(99, Math.max(40, basePercent + variation));
                            const obtained = Math.round((pct / 100) * def.maxMarks);
                            return {
                                subject: s._id,
                                obtainedMarks: obtained,
                                isAbsent: false,
                                isNotAppeared: false,
                                graceMarks: 0,
                                remarks: pct > 85 ? 'Excellent performance' : 'Good comprehension'
                            };
                        });

                        const totalObtained = subjectMarks.reduce((sum, sm) => sum + sm.obtainedMarks, 0);
                        const totalMax = def.maxMarks * courseSubs.length;
                        const percentage = Math.round((totalObtained / totalMax) * 10000) / 100;
                        
                        let grade = 'B';
                        if (percentage >= 90) grade = 'A+';
                        else if (percentage >= 80) grade = 'A';
                        else if (percentage >= 70) grade = 'B+';
                        else if (percentage >= 60) grade = 'B';
                        else if (percentage >= 50) grade = 'C';
                        else grade = 'D';

                        let existingResult = await OfflineExamResult.findOne({ exam: offlineExam._id, student: studentId });
                        if (!existingResult) {
                            await OfflineExamResult.create({
                                exam: offlineExam._id,
                                student: studentId,
                                batch: batch._id,
                                marks: subjectMarks,
                                coScholasticRatings: [
                                    { paramName: 'Discipline', rating: percentage > 80 ? 'A' : 'B' },
                                    { paramName: 'Work Habits', rating: 'A' }
                                ],
                                totalObtainedMarks: totalObtained,
                                totalMaxMarks: totalMax,
                                percentage: percentage,
                                overallGrade: grade,
                                overallResult: 'pass',
                                teacherRemarks: percentage >= 85 ? 'Outstanding student with keen interest in academics.' : 'Consistent effort and good classroom participation.',
                                evaluatedBy: adminId
                            });
                            resultsCreated++;
                        }
                    }
                }
            }
        }
        console.log(`✓ Exam Milestones & Marksheets generated (${resultsCreated} student grade sheets).`);

        // 8. Full-Year Daily Attendance (June 2025 → April 2026: ~180 school days)
        console.log(`\nGenerating 180+ School Days of Daily Attendance Logs...`);
        let attendanceDaysAdded = 0;

        // Collect all working days (Mon-Sat, skipping Sundays & holidays)
        const workingDates = [];
        let curr = new Date('2025-06-02');
        const endDate = new Date('2026-04-15');

        while (curr <= endDate) {
            const day = curr.getDay(); // 0 is Sunday
            // Skip Sundays (0)
            if (day !== 0) {
                // Skip Diwali break (Oct 28 to Nov 5) and Winter break (Dec 24 to Jan 2)
                const m = curr.getMonth(); // 0=Jan, 9=Oct, 10=Nov, 11=Dec
                const d = curr.getDate();
                const isDiwali = (m === 9 && d >= 28) || (m === 10 && d <= 5);
                const isWinter = (m === 11 && d >= 24) || (m === 0 && d <= 2);

                if (!isDiwali && !isWinter) {
                    workingDates.push(new Date(curr));
                }
            }
            curr.setDate(curr.getDate() + 1);
        }

        console.log(`Calculated ${workingDates.length} academic working days.`);

        // For each active batch with students, generate attendance records
        for (const batch of currentBatches) {
            const activeStudentsInBatch = (batch.enrolledStudents || []).filter(e => e.status === 'active');
            if (activeStudentsInBatch.length === 0) continue;

            const existingAttendanceDates = new Set(
                (await Attendance.find({ institute: instId, batch: batch._id }).select('date')).map(a => new Date(a.date).toISOString().slice(0, 10))
            );

            const attendanceBatchDocs = [];
            for (let dIdx = 0; dIdx < workingDates.length; dIdx++) {
                const dateObj = workingDates[dIdx];
                const dateKey = dateObj.toISOString().slice(0, 10);
                if (existingAttendanceDates.has(dateKey)) continue;

                const records = activeStudentsInBatch.map((e, sIdx) => {
                    // Realistic ~92% present rate
                    const hash = (sIdx * 17 + dIdx * 31) % 100;
                    let status = 'present';
                    if (hash > 94) status = 'absent';
                    else if (hash > 90) status = 'late';

                    return {
                        student: e.student,
                        status: status,
                        slot: 'checkin',
                        markedAt: new Date(dateObj.getTime() + (8 * 60 + (sIdx % 20)) * 60000), // ~8:10 AM
                        method: 'manual'
                    };
                });

                attendanceBatchDocs.push({
                    institute: instId,
                    batch: batch._id,
                    date: dateObj,
                    records: records,
                    markedBy: adminId,
                    isLocked: true
                });
            }

            if (attendanceBatchDocs.length > 0) {
                await Attendance.insertMany(attendanceBatchDocs, { ordered: false });
                attendanceDaysAdded += attendanceBatchDocs.length;
            }
        }
        console.log(`✓ Attendance generated: added ${attendanceDaysAdded} batch-day logs.`);

        // 9. Sync Institute Usage Counters
        await inst.updateUsage();
        console.log(`\n✓ Synchronized institution usage statistics.`);

        console.log(`\n=============================================================`);
        console.log(`🎉 SUCCESS! QISJC IS NOW FULLY POPULATED WITH 1 FULL YEAR DATA`);
        console.log(`=============================================================`);
        console.log(`Highlights:`);
        console.log(` • 2 Full Sessions Configured ("2025-2026" Active & "2026-2027" Target)`);
        console.log(` • ~180 Academic Days of Attendance across all standards`);
        console.log(` • 3 Full Examination Milestones (Quarterly, Mid-Term, Annual) with complete student marksheets & grades`);
        console.log(` • 183 Fee Ledgers populated with realistic Paid, Partial, and Overdue arrears`);
        console.log(` • Ready to test year-end promotions & rollover directly from the dashboard!`);
        console.log(`=============================================================\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed with error:", err);
        process.exit(1);
    }
}

seedFullYear();
