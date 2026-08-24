import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();


import { connectDB } from '../lib/mongodb.js';
import Institute from '../models/Institute.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Subject from '../models/Subject.js';
import OfflineExam from '../models/OfflineExam.js';
import OfflineExamResult from '../models/OfflineExamResult.js';

async function seedTestExam() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');


        // 1. Find an institute
        const institute = await Institute.findOne();
        if (!institute) {
            console.error('No institute found in database.');
            process.exit(1);
        }
        console.log(`Found Institute: ${institute.name} (Code: ${institute.code})`);

        // 2. Find or create Active Session
        let session = await Session.findOne({ instituteId: institute._id, isActive: true });
        if (!session) {
            session = await Session.create({
                sessionName: '25-26',
                instituteId: institute._id,
                isActive: true,
                startDate: new Date('2025-04-01'),
                endDate: new Date('2026-03-31')
            });
            console.log('Created Active Session: 25-26');
        } else {
            console.log(`Using Active Session: ${session.sessionName}`);
        }

        // 3. Find or create Course & Batch
        let course = await Course.findOne({ institute: institute._id });
        if (!course) {
            course = await Course.create({
                name: 'Secondary Education (Class X)',
                code: 'SEC-10',
                institute: institute._id,
                duration: 12
            });
        }

        let batch = await Batch.findOne({ institute: institute._id, course: course._id });
        if (!batch) {
            batch = await Batch.create({
                name: 'Section A - 2025',
                code: 'SEC-A-25',
                course: course._id,
                institute: institute._id,
                session: session._id,
                capacity: 60
            });
        }

        // 4. Find or create Subject
        let subjects = await Subject.find({ institute: institute._id, course: course._id });
        if (subjects.length === 0) {
            const math = await Subject.create({ name: 'Mathematics', code: 'MATH-101', course: course._id, institute: institute._id });
            const science = await Subject.create({ name: 'Science & Technology', code: 'SCI-102', course: course._id, institute: institute._id });
            const english = await Subject.create({ name: 'English Literature', code: 'ENG-103', course: course._id, institute: institute._id });
            subjects = [math, science, english];
        }

        // 5. Find or create Test Student
        let student = await User.findOne({ institute: institute._id, role: 'student' });
        if (!student) {
            student = await User.create({
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
                }
            });
            console.log('Created test student: Ayan Shaikh (STU-2025-001, DOB: 2006-05-15)');
        } else {
            // Ensure student has enrollmentNumber and dateOfBirth
            if (!student.enrollmentNumber) student.enrollmentNumber = 'STU-2025-001';
            if (!student.profile?.dateOfBirth) {
                if (!student.profile) student.profile = {};
                student.profile.dateOfBirth = new Date('2006-05-15');
            }
            await student.save();
            console.log(`Using Student: ${student.profile?.firstName || 'Student'} ${student.profile?.lastName || ''} (Enrollment: ${student.enrollmentNumber}, DOB: ${student.profile?.dateOfBirth?.toISOString().slice(0, 10)})`);
        }

        // 6. Create or update Published Offline Exam
        let exam = await OfflineExam.findOne({ institute: institute._id, session: session._id, status: 'published' });
        if (!exam) {
            exam = await OfflineExam.create({
                title: 'Annual Board Examination 2025-26',
                institute: institute._id,
                course: course._id,
                session: session._id,
                batches: [batch._id],
                examType: 'annual',
                status: 'published',
                subjects: subjects.map(s => ({
                    subject: s._id,
                    maxMarks: 100,
                    passingMarks: 35,
                    examDate: new Date()
                })),
                coScholastic: [
                    { paramName: 'Discipline & Conduct', ratingScale: 'A-E' },
                    { paramName: 'Teamwork & Communication', ratingScale: 'A-E' }
                ]
            });
            console.log('Created Published Offline Exam: Annual Board Examination 2025-26');
        }

        // 7. Create or update Marksheet Result
        let result = await OfflineExamResult.findOne({ exam: exam._id, student: student._id });
        if (!result) {
            result = await OfflineExamResult.create({
                exam: exam._id,
                student: student._id,
                batch: batch._id,
                marks: [
                    { subject: subjects[0]._id, obtainedMarks: 88, graceMarks: 0, remarks: 'Excellent performance' },
                    { subject: subjects[1]._id, obtainedMarks: 92, graceMarks: 0, remarks: 'Outstanding' },
                    { subject: subjects[2]._id, obtainedMarks: 79, graceMarks: 0, remarks: 'Good grasp of language' }
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
                teacherRemarks: 'Promoted to the next academic grade with Distinction.'
            });
            console.log('Created Result Statement of Marks for Ayan Shaikh');
        }

        console.log('\n=============================================');
        console.log('✅ TEST DATA READY FOR VERIFICATION!');
        console.log(`1. Institute Code: ${institute.code}`);
        console.log(`2. Student Enrollment No: ${student.enrollmentNumber}`);
        console.log(`3. Student Date of Birth: ${student.profile.dateOfBirth.toISOString().slice(0, 10)}`);
        console.log(`4. Result ID: ${result._id}`);
        console.log(`5. Public Result URL: http://localhost:3000/website/${institute.code}/results`);
        console.log(`6. Direct PDF URL: http://localhost:3000/api/v1/public/results/marksheet/${result._id}/pdf`);
        console.log(`7. QR Verification URL: http://localhost:3000/verify/marksheet/${result._id}`);
        console.log('=============================================\n');

        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seedTestExam();
