import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function seedStudents() {
    try {
        const { connectDB } = await import('../lib/mongodb.js');
        const Institute = (await import('../models/Institute.js')).default;
        const Session = (await import('../models/Session.js')).default;
        const { StudentService } = await import('../services/studentService.js');
        const User = (await import('../models/User.js')).default;

        await connectDB();

        // 1. Find the test institute
        const institute = await Institute.findOne({ code: 'TEST' });
        if (!institute) {
            console.error("Institute 'TEST' not found!");
            process.exit(1);
        }

        // 2. Find the current session for this institute
        const activeSession = await Session.findOne({ instituteId: institute._id, isActive: true });
        if (!activeSession) {
            console.error("No active session found for TEST institute!");
            process.exit(1);
        }

        // 3. Find an admin user to be the actor
        const admin = await User.findOne({ institute: institute._id, role: 'admin' });
        const actorId = admin ? admin._id : null;

        console.log(`Seeding 3 students for ${institute.name} in session ${activeSession.sessionName}...`);

        const mockStudents = [
            {
                email: 'student1@test.com',
                profile: { firstName: 'Aarav', lastName: 'Sharma', gender: 'male' },
                institute: institute._id
            },
            {
                email: 'student2@test.com',
                profile: { firstName: 'Diya', lastName: 'Patel', gender: 'female' },
                institute: institute._id
            },
            {
                email: 'student3@test.com',
                profile: { firstName: 'Ishaan', lastName: 'Gupta', gender: 'male' },
                institute: institute._id
            }
        ];

        for (const data of mockStudents) {
            const student = await StudentService.createStudent(data, actorId, activeSession._id);
            console.log(`Created student: ${student.profile.firstName} ${student.profile.lastName} (${student.email})`);
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seedStudents();
