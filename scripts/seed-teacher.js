const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: '.env' });
}

// Inline Minimal Schemas for standalone execution
const InstituteSchema = new mongoose.Schema({
    name: String,
    code: String,
    type: { type: String, default: 'SCHOOL' },
    status: { type: String, default: 'active' },
    isActive: { type: Boolean, default: true }
}, { strict: false });

const AcademicSessionSchema = new mongoose.Schema({
    sessionName: String,
    startDate: Date,
    endDate: Date,
    isActive: Boolean,
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' }
}, { strict: false });

const CourseSchema = new mongoose.Schema({
    name: String,
    code: String,
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' }
}, { strict: false });

const BatchSchema = new mongoose.Schema({
    name: String,
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' }
}, { strict: false });

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    assignments: {
        batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
        courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
    },
    permissions: [String],
    profile: {
        firstName: String,
        lastName: String,
        phone: String
    },
    enrollmentNumber: String,
    deletedAt: Date
}, { strict: false });

const MembershipSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    role: String,
    isActive: { type: Boolean, default: true }
}, { strict: false });

const Institute = mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
const AcademicSession = mongoose.models.AcademicSession || mongoose.model('AcademicSession', AcademicSessionSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

async function seedTeacher() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims';
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB!');

        // 1. Get or Create Active Institute
        let institute = await Institute.findOne({ status: 'active' });
        if (!institute) {
            institute = await Institute.create({
                name: "Shalom International School",
                code: "SHALOM01",
                type: "SCHOOL",
                status: "active",
                isActive: true
            });
            console.log(`Created Institute: ${institute.name} (${institute.code})`);
        } else {
            console.log(`Using existing Institute: ${institute.name} (ID: ${institute._id})`);
        }

        // 2. Get or Create Academic Session
        let session = await AcademicSession.findOne({ institute: institute._id, isActive: true });
        if (!session) {
            session = await AcademicSession.create({
                sessionName: "2025-26",
                startDate: new Date("2025-04-01"),
                endDate: new Date("2026-03-31"),
                isActive: true,
                institute: institute._id
            });
            console.log(`Created Academic Session: 2025-26`);
        }

        // 3. Get or Create Class/Course (e.g. Grade 10)
        let course = await Course.findOne({ institute: institute._id, name: /Grade 10|Class 10/i });
        if (!course) {
            course = await Course.create({
                name: "Grade 10",
                code: "G10",
                institute: institute._id,
                session: session._id
            });
            console.log(`Created Class/Course: Grade 10`);
        }

        // 4. Get or Create Section/Batch (e.g. Section A & Section B)
        let batchA = await Batch.findOne({ institute: institute._id, course: course._id, name: /Section A/i });
        if (!batchA) {
            batchA = await Batch.create({
                name: "Section A",
                course: course._id,
                session: session._id,
                institute: institute._id
            });
            console.log(`Created Section A`);
        }

        let batchB = await Batch.findOne({ institute: institute._id, course: course._id, name: /Section B/i });
        if (!batchB) {
            batchB = await Batch.create({
                name: "Section B",
                course: course._id,
                session: session._id,
                institute: institute._id
            });
            console.log(`Created Section B`);
        }

        // 5. Seed Demo Students if none exist for Batch A
        const existingStudentsCount = await User.countDocuments({ institute: institute._id, role: 'student' });
        if (existingStudentsCount === 0) {
            const studentPasswordHash = await bcrypt.hash('Student@123', 10);
            const sampleStudents = [
                { firstName: 'Aarav', lastName: 'Sharma', roll: '1001' },
                { firstName: 'Ananya', lastName: 'Verma', roll: '1002' },
                { firstName: 'Rohan', lastName: 'Kulkarni', roll: '1003' },
                { firstName: 'Priya', lastName: 'Deshmukh', roll: '1004' },
                { firstName: 'Kabir', lastName: 'Patel', roll: '1005' },
                { firstName: 'Isha', lastName: 'Joshi', roll: '1006' }
            ];

            for (const s of sampleStudents) {
                await User.create({
                    email: `student.${s.roll}@school.edu`,
                    passwordHash: studentPasswordHash,
                    role: 'student',
                    institute: institute._id,
                    enrollmentNumber: s.roll,
                    profile: { firstName: s.firstName, lastName: s.lastName, phone: '9876543210' }
                });
            }
            console.log(`Seeded 6 sample students in Institute!`);
        } else {
            console.log(`Found ${existingStudentsCount} existing students in Institute.`);
        }

        // 6. Create or Update Teacher Account
        const teacherEmail = 'teacher@school.edu';
        const passwordHash = await bcrypt.hash('Teacher@123', 10);

        let teacher = await User.findOne({ email: teacherEmail });
        if (!teacher) {
            teacher = await User.create({
                email: teacherEmail,
                passwordHash: passwordHash,
                role: 'instructor',
                institute: institute._id,
                assignments: {
                    batches: [batchA._id, batchB._id],
                    courses: [course._id]
                },
                permissions: ['view_front_office', 'manage_notices', 'manage_exams', 'view_attendance'],
                profile: {
                    firstName: 'Sarah',
                    lastName: 'Sharma',
                    phone: '9876543210'
                }
            });
            console.log(`✅ Teacher Account Created: ${teacherEmail}`);
        } else {
            teacher.passwordHash = passwordHash;
            teacher.role = 'instructor';
            teacher.institute = institute._id;
            teacher.assignments = {
                batches: [batchA._id, batchB._id],
                courses: [course._id]
            };
            teacher.permissions = ['view_front_office', 'manage_notices', 'manage_exams', 'view_attendance'];
            teacher.profile = { firstName: 'Sarah', lastName: 'Sharma', phone: '9876543210' };
            await teacher.save();
            console.log(`✅ Teacher Account Updated: ${teacherEmail}`);
        }

        // 7. Ensure Membership exists
        const membership = await Membership.findOne({ user: teacher._id, institute: institute._id });
        if (!membership) {
            await Membership.create({
                user: teacher._id,
                institute: institute._id,
                role: 'instructor',
                isActive: true
            });
            console.log(`Linked teacher membership to ${institute.name}`);
        }

        console.log("\n=======================================================");
        console.log("🎉 TEACHER SEED SUCCESSFUL 🎉");
        console.log(`School / Institute : ${institute.name}`);
        console.log(`Teacher Name       : Sarah Sharma`);
        console.log(`Email              : ${teacherEmail}`);
        console.log(`Password           : Teacher@123`);
        console.log(`Assigned Classes   : Grade 10 (Section A, Section B)`);
        console.log("=======================================================\n");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed Error:", err);
        process.exit(1);
    }
}

seedTeacher();
