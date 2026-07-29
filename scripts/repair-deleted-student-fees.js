import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Fee from '../models/Fee.js';
import TransportFee from '../models/TransportFee.js';
import HostelAllotment from '../models/HostelAllotment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all disabled students (role: 'student', deletedAt is not null)
        const disabledStudents = await User.find({
            role: 'student',
            deletedAt: { $ne: null }
        });

        console.log(`Found ${disabledStudents.length} disabled/soft-deleted students.`);

        let totalFeeUpdated = 0;
        let totalTransportFeeUpdated = 0;
        let totalHostelUpdated = 0;

        for (const student of disabledStudents) {
            const studentId = student._id;
            const toggleDate = student.deletedAt;

            // 1. Sync Fee records
            const feeRes = await Fee.updateMany(
                { student: studentId, deletedAt: null },
                { $set: { deletedAt: toggleDate } }
            );
            totalFeeUpdated += feeRes.modifiedCount;

            // 2. Sync TransportFee records
            const transportRes = await TransportFee.updateMany(
                { student: studentId, deletedAt: null },
                { $set: { deletedAt: toggleDate } }
            );
            totalTransportFeeUpdated += transportRes.modifiedCount;

            // 3. Sync HostelAllotment records
            const hostelRes = await HostelAllotment.updateMany(
                { student: studentId, deletedAt: null },
                { $set: { deletedAt: toggleDate } }
            );
            totalHostelUpdated += hostelRes.modifiedCount;
        }

        console.log(`Successfully soft-deleted associated records for disabled students:`);
        console.log(`- Course Fees (Fee): ${totalFeeUpdated} records updated`);
        console.log(`- Transport Fees (TransportFee): ${totalTransportFeeUpdated} records updated`);
        console.log(`- Hostel Allotments (HostelAllotment): ${totalHostelUpdated} records updated`);

    } catch (error) {
        console.error('❌ Repair failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

run();
