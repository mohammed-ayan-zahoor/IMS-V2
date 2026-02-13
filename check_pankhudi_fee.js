import { connectDB } from './lib/mongodb.js';
import mongoose from 'mongoose';
import Fee from './models/Fee.js';
import User from './models/User.js';

async function checkFee() {
    try {
        await connectDB();

        // 1. Find the student
        const student = await User.findOne({
            "profile.firstName": "Pankhudi",
            "profile.lastName": { $regex: /Agarwal/i }
        });

        if (!student) {
            console.log("Student 'Pankhudi Pramod Agarwal' not found.");
            // List similar names?
            const similar = await User.find({ "profile.firstName": "Pankhudi" });
            if (similar.length > 0) {
                console.log("Did you mean:", similar.map(s => `${s.profile.firstName} ${s.profile.lastName}`));
            }
            return;
        }

        console.log(`Checking fees for: ${student.profile.firstName} ${student.profile.lastName} (${student._id})`);

        // 2. Find ALL fees (ignoring soft delete filter of model if any, but we use native collection or Mongoose without filter)
        // Mongoose find() by default DOES NOT filter soft deletes unless we use a plugin or explicit query.
        // My FeeService manual query adds { deletedAt: null }, but here I want to see everything.

        const fees = await Fee.find({ student: student._id });

        if (fees.length === 0) {
            console.log("No fee records found for this student.");
        } else {
            console.log(`Found ${fees.length} fee records:`);
            fees.forEach(fee => {
                const isDeleted = !!fee.deletedAt;
                console.log(`- Batch: ${fee.batch} | Total: ₹${fee.totalAmount} | Status: ${fee.status}`);
                console.log(`  ID: ${fee._id} | Deleted: ${isDeleted} (${fee.deletedAt || 'Active'})`);

                if (isDeleted) {
                    console.log("  [CONFIRMED] This fee is SOFT DELETED. It should NOT appear on the Fee Page.");
                } else {
                    console.log("  [ACTIVE] This fee is ACTIVE. It SHOULD appear on the Fee Page.");
                }
            });
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        process.exit(0);
    }
}

checkFee();
