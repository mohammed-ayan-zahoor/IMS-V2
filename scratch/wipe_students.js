import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Now import the rest dynamically
async function wipeStudents() {
    try {
        const { connectDB } = await import('../lib/mongodb.js');
        const User = (await import('../models/User.js')).default;
        const Institute = (await import('../models/Institute.js')).default;
        const Batch = (await import('../models/Batch.js')).default;
        const Fee = (await import('../models/Fee.js')).default;
        const Membership = (await import('../models/Membership.js')).default;

        await connectDB();
        
        // 1. Find the test institute
        const institute = await Institute.findOne({ code: 'TEST' });
        if (!institute) {
            console.error("Institute 'TEST' not found!");
            process.exit(1);
        }
        
        const instId = institute._id;
        console.log(`Wiping students for institute: ${institute.name} (${instId})`);
        
        // 2. Find all students for this institute
        const students = await User.find({ institute: instId, role: 'student' }).select('_id');
        const studentIds = students.map(s => s._id);
        
        console.log(`Found ${studentIds.length} students to delete.`);
        
        // 3. Delete Fees
        const feeRes = await Fee.deleteMany({ institute: instId });
        console.log(`Deleted ${feeRes.deletedCount} fee records.`);
        
        // 4. Delete Memberships
        const memRes = await Membership.deleteMany({ institute: instId, role: 'student' });
        console.log(`Deleted ${memRes.deletedCount} student membership records.`);
        
        // 5. Clear Batch Enrollments
        const batchRes = await Batch.updateMany(
            { institute: instId },
            { $set: { enrolledStudents: [] } }
        );
        console.log(`Cleared enrollments for ${batchRes.modifiedCount} batches.`);
        
        // 6. Delete User records
        const userRes = await User.deleteMany({ 
            institute: instId, 
            role: 'student' 
        });
        console.log(`Deleted ${userRes.deletedCount} student user records.`);
        
        console.log("Wipe complete!");
        process.exit(0);
    } catch (error) {
        console.error("Wipe failed:", error);
        process.exit(1);
    }
}

wipeStudents();
