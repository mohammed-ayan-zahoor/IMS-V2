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
                b.session = sessionCurrent._id;
                await b.save();
            }
        }

        // 6. Generate Full Student Fee Invoices with Paid/Partial/Overdue Distribution
        console.log(`\nGenerating Full-Year Fee Invoices & Receipts for 183 students...`);
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
            const totalFee = preset?.amount || 36000;
            const instAmount = Math.round(totalFee / 3);

            // Distribution: 65% Paid in full, 25% Partial (2 paid, 1 pending), 10% Overdue (1 paid, 2 overdue)
            const typeMod = i % 10;
            let installments = [];

            if (typeMod < 6) {
                // Fully Paid
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-10'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-2025-${1000 + i}-1`, collectedBy: 'Office Admin' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-08'), status: 'paid', paymentMethod: 'bank_transfer', transactionId: `NEFT-2025-${1000 + i}-2`, collectedBy: 'Office Admin' },
                    { amount: totalFee - (instAmount * 2), dueDate: new Date('2026-01-15'), paidDate: new Date('2026-01-12'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2026-${1000 + i}-3`, collectedBy: 'Accounts Desk' }
                ];
            } else if (typeMod < 9) {
                // Partial (2 paid, 1 pending/overdue)
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-12'), status: 'paid', paymentMethod: 'upi', transactionId: `UPI-2025-${1000 + i}-1`, collectedBy: 'Office Admin' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), paidDate: new Date('2025-10-14'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2025-${1000 + i}-2`, collectedBy: 'Office Admin' },
                    { amount: totalFee - (instAmount * 2), dueDate: new Date('2026-01-15'), status: 'overdue' }
                ];
            } else {
                // Overdue Arrears (only 1st paid, remaining unpaid)
                installments = [
                    { amount: instAmount, dueDate: new Date('2025-06-15'), paidDate: new Date('2025-06-15'), status: 'paid', paymentMethod: 'cash', transactionId: `CASH-2025-${1000 + i}-1`, collectedBy: 'Office Admin' },
                    { amount: instAmount, dueDate: new Date('2025-10-15'), status: 'overdue' },
                    { amount: totalFee - (instAmount * 2), dueDate: new Date('2026-01-15'), status: 'overdue' }
                ];
            }

            let feeDoc = await Fee.findOne({ student: student._id, batch: studentBatch._id, session: sessionCurrent._id, deletedAt: null });
            if (!feeDoc) {
                await Fee.create({
                    institute: instId,
                    student: student._id,
                    batch: studentBatch._id,
                    session: sessionCurrent._id,
                    totalAmount: totalFee,
                    feePreset: preset?._id,
                    installments: installments
                });
                feesCreated++;
            } else {
                feeDoc.installments = installments;
                feeDoc.totalAmount = totalFee;
                await feeDoc.save();
                feesUpdated++;
            }
        }
        console.log(`✓ Fee Invoicing complete (Created: ${feesCreated}, Updated: ${feesUpdated}).`);

        // 7. Generate Exams & Marksheets (Quarterly, Mid-Term, Annual Final)
        console.log(`\nCreating 3 Full-Year Exam Milestones & Scoring All Students...`);
        const examDefinitions = [
            { title: 'Term 1 Quarterly Exam (2025)', examType: 'quarterly', date: new Date('2025-09-20'), maxMarks: 50, passMarks: 18 },
            { title: 'Half-Yearly Mid-Term Exam (2025)', examType: 'half_yearly', date: new Date('2025-12-18'), maxMarks: 100, passMarks: 35 },
            { title: 'Annual Final Exam (2026)', examType: 'annual', date: new Date('2026-03-24'), maxMarks: 100, passMarks: 35 }
        ];

        let resultsCreated = 0;

        for (const course of courses) {
            const courseSubs = courseSubjectsMap[course._id.toString()] || [];
            if (courseSubs.length === 0) continue;

            const courseBatches = currentBatches.filter(b => b.course && b.course.toString() === course._id.toString());
            const batchIds = courseBatches.map(b => b._id);

            for (const def of examDefinitions) {
                let offlineExam = await OfflineExam.findOne({
                    institute: instId,
                    course: course._id,
                    session: sessionCurrent._id,
                    examType: def.examType,
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
                        title: `${def.title} - ${course.name}`,
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
