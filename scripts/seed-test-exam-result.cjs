const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Get Institute
        const institute = await db.collection('institutes').findOne();
        if (!institute) {
            console.log('No institute found.');
            process.exit(1);
        }
        console.log(`Institute: ${institute.name} (Code: ${institute.code})`);

        // 2. Active Session
        let session = await db.collection('sessions').findOne({ instituteId: institute._id, isActive: true });
        if (!session) {
            const insertSession = await db.collection('sessions').insertOne({
                sessionName: '25-26',
                instituteId: institute._id,
                isActive: true,
                startDate: new Date('2025-04-01'),
                endDate: new Date('2026-03-31'),
                createdAt: new Date(),
                updatedAt: new Date()
            });
            session = { _id: insertSession.insertedId, sessionName: '25-26' };
            console.log('Created active session: 25-26');
        } else {
            console.log(`Active Session: ${session.sessionName}`);
        }

        // 3. Course & Batch
        let course = await db.collection('courses').findOne({ institute: institute._id });
        if (!course) {
            const insertCourse = await db.collection('courses').insertOne({
                name: 'Secondary Education (Class X)',
                code: 'SEC-10',
                institute: institute._id,
                duration: 12,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            course = { _id: insertCourse.insertedId, name: 'Secondary Education (Class X)' };
        }

        let batch = await db.collection('batches').findOne({ institute: institute._id });
        if (!batch) {
            const insertBatch = await db.collection('batches').insertOne({
                name: 'Section A - 2025',
                code: 'SEC-A-25',
                course: course._id,
                institute: institute._id,
                session: session._id,
                capacity: 60,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            batch = { _id: insertBatch.insertedId, name: 'Section A - 2025' };
        }

        // 4. Subjects
        let subjects = await db.collection('subjects').find({ institute: institute._id }).toArray();
        if (subjects.length === 0) {
            const math = await db.collection('subjects').insertOne({ name: 'Mathematics', code: 'MATH-101', course: course._id, institute: institute._id, createdAt: new Date(), updatedAt: new Date() });
            const sci = await db.collection('subjects').insertOne({ name: 'Science & Technology', code: 'SCI-102', course: course._id, institute: institute._id, createdAt: new Date(), updatedAt: new Date() });
            const eng = await db.collection('subjects').insertOne({ name: 'English Literature', code: 'ENG-103', course: course._id, institute: institute._id, createdAt: new Date(), updatedAt: new Date() });
            subjects = [
                { _id: math.insertedId, name: 'Mathematics', code: 'MATH-101' },
                { _id: sci.insertedId, name: 'Science & Technology', code: 'SCI-102' },
                { _id: eng.insertedId, name: 'English Literature', code: 'ENG-103' }
            ];
        }

        // 5. Student
        let student = await db.collection('users').findOne({ institute: institute._id, role: 'student' });
        if (!student) {
            const insertStudent = await db.collection('users').insertOne({
                email: 'test.student@quantech.edu',
                passwordHash: 'dummy_hash',
                role: 'student',
                institute: institute._id,
                enrollmentNumber: 'STU-2025-001',
                profile: {
                    firstName: 'Ayan',
                    lastName: 'Shaikh',
                    dateOfBirth: new Date('2006-05-15'),
                    gender: 'Male',
                    phone: '9876543210',
                    address: {
                        street: '123 Academic Block',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001'
                    }
                },
                guardianDetails: {
                    name: 'Mohammed Shaikh',
                    phone: '9876543211',
                    relation: 'father'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            student = {
                _id: insertStudent.insertedId,
                enrollmentNumber: 'STU-2025-001',
                profile: { firstName: 'Ayan', lastName: 'Shaikh', dateOfBirth: new Date('2006-05-15') }
            };
            console.log('Created test student: Ayan Shaikh (STU-2025-001, DOB: 2006-05-15)');
        } else {
            const dob = student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth) : new Date('2006-05-15');
            const enr = student.enrollmentNumber || 'STU-2025-001';
            await db.collection('users').updateOne(
                { _id: student._id },
                { $set: { enrollmentNumber: enr, 'profile.dateOfBirth': dob } }
            );
            student.enrollmentNumber = enr;
            student.profile = { ...(student.profile || {}), dateOfBirth: dob };
            console.log(`Using Student: ${student.profile?.firstName || 'Student'} ${student.profile?.lastName || ''} (Enrollment: ${enr}, DOB: ${dob.toISOString().slice(0, 10)})`);
        }

        // 6. Offline Exam
        let exam = await db.collection('offlineexams').findOne({ institute: institute._id, session: session._id, status: 'published' });
        if (!exam) {
            const insertExam = await db.collection('offlineexams').insertOne({
                title: 'Annual Board Examination 2025-26',
                institute: institute._id,
                course: course._id,
                session: session._id,
                batches: [batch._id],
                examType: 'annual',
                status: 'published',
                subjects: subjects.slice(0, 3).map(s => ({
                    subject: s._id,
                    maxMarks: 100,
                    passingMarks: 35,
                    examDate: new Date()
                })),
                coScholastic: [
                    { paramName: 'Discipline & Conduct', ratingScale: 'A-E' },
                    { paramName: 'Teamwork & Communication', ratingScale: 'A-E' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            exam = { _id: insertExam.insertedId, title: 'Annual Board Examination 2025-26' };
            console.log('Created Published Offline Exam: Annual Board Examination 2025-26');
        }

        // 7. Offline Exam Result
        let result = await db.collection('offlineexamresults').findOne({ exam: exam._id, student: student._id });
        if (!result) {
            const insertResult = await db.collection('offlineexamresults').insertOne({
                exam: exam._id,
                student: student._id,
                batch: batch._id,
                marks: [
                    { subject: subjects[0]._id, obtainedMarks: 88, isAbsent: false, graceMarks: 0, remarks: 'Excellent performance' },
                    { subject: subjects[1]._id, obtainedMarks: 92, isAbsent: false, graceMarks: 0, remarks: 'Outstanding' },
                    { subject: subjects[2]._id, obtainedMarks: 79, isAbsent: false, graceMarks: 0, remarks: 'Good grasp of language' }
                ],
                coScholasticRatings: [
                    { paramName: 'Discipline & Conduct', rating: 'A+' },
                    { paramName: 'Teamwork & Communication', rating: 'A' }
                ],
                totalObtainedMarks: 259,
                totalMaxMarks: 300,
                percentage: 86.33,
                overallGrade: 'A+',
                rank: 1,
                overallResult: 'pass',
                teacherRemarks: 'Promoted to the next academic grade with Distinction.',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            result = { _id: insertResult.insertedId };
            console.log('Created Result Statement of Marks for student.');
        }

        console.log('\n=============================================');
        console.log('🎉 TEST DATA READY FOR VERIFICATION!');
        console.log(`1. Institute Code: ${institute.code}`);
        console.log(`2. Student Enrollment No: ${student.enrollmentNumber}`);
        console.log(`3. Student Date of Birth: ${student.profile.dateOfBirth.toISOString().slice(0, 10)}`);
        console.log(`4. Result ID: ${result._id}`);
        console.log(`5. Public Result URL: http://localhost:3000/website/${institute.code}/results`);
        console.log(`6. Direct PDF URL: http://localhost:3000/api/v1/public/results/marksheet/${result._id}/pdf`);
        console.log(`7. QR Verification URL: http://localhost:3000/verify/marksheet/${result._id}`);
        console.log('=============================================\n');

        process.exit(0);
    } catch (e) {
        console.error('Run error:', e);
        process.exit(1);
    }
}

run();
