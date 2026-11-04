import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) { console.error('No MONGODB_URI'); process.exit(1); }
    await mongoose.connect(mongoUri);

    const Institute = (await import('../models/Institute.js')).default;
    const Batch = (await import('../models/Batch.js')).default;
    const Fee = (await import('../models/Fee.js')).default;

    const inst = await Institute.findOne({
        $or: [{ code: 'SDCDEGKOLAR' }, { code: 'SDCDEG' }, { name: { $regex: /danamma/i } }],
        deletedAt: null
    });
    if (!inst) { console.error('Institute not found'); process.exit(1); }

    console.log(`Institute: ${inst.name} (${inst._id})`);

    // Find all fees for SDC students
    const fees = await Fee.find({ institute: inst._id, deletedAt: null }).select('student batch session totalAmount');
    console.log(`Found ${fees.length} fee records`);

    let enrolledCount = 0;
    for (const f of fees) {
        if (!f.batch || !f.student) continue;
        const res = await Batch.updateOne(
            { _id: f.batch, 'enrolledStudents.student': { $ne: f.student } },
            { $push: { enrolledStudents: { student: f.student, enrolledAt: new Date(), status: 'active' } } }
        );
        if (res.modifiedCount > 0) enrolledCount++;
    }

    console.log(`Enrolled ${enrolledCount} student-batch links matching fee history!`);
    process.exit(0);
}

run().catch(console.error);
