import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function checkData() {
    try {
        const { connectDB } = await import('../lib/mongodb.js');
        const Institute = (await import('../models/Institute.js')).default;
        const User = (await import('../models/User.js')).default;
        const Session = (await import('../models/Session.js')).default;

        await connectDB();

        const inst = await Institute.findOne({ code: 'TEST' });
        console.log(`Institute TEST type: ${inst.type}`);

        const activeSession = await Session.findOne({ instituteId: inst._id, isActive: true });
        console.log(`Active Session: ${activeSession ? activeSession.sessionName : 'NONE'} (${activeSession ? activeSession._id : ''})`);

        const students = await User.find({ institute: inst._id, role: 'student' });
        console.log(`Found ${students.length} students.`);
        students.forEach(s => {
            console.log(`Student: ${s.email}, activeSessions: ${JSON.stringify(s.activeSessions)}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkData();
