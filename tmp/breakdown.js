import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error("MONGODB_URI is not set in .env.local");
    process.exit(1);
}
async function breakdown() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const institutesCount = {};
    const students = await mongoose.connection.db.collection('users').find({ role: 'student', deletedAt: null }).toArray();

    for (const student of students) {
        const instId = student.institute ? student.institute.toString() : 'NONE';
        institutesCount[instId] = (institutesCount[instId] || 0) + 1;
    }

    const institutes = await mongoose.connection.db.collection('institutes').find({}).toArray();

    console.log("\nStudent counts per institute:");
    for (const instId in institutesCount) {
        const inst = institutes.find(i => i._id.toString() === instId);
        const name = inst ? `${inst.name} (${inst.code})` : 'Orphan/Unknown';
        console.log(`- ${name} [${instId}]: ${institutesCount[instId]}`);
    }

    await mongoose.disconnect();
}

breakdown();
