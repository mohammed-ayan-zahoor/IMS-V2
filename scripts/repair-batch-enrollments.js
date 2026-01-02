const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const BatchSchema = new mongoose.Schema({
    name: String,
    enrolledStudents: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String
    }]
});
const StudentSchema = new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId });

const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
const User = mongoose.models.User || mongoose.model('User', StudentSchema);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log("---------------------------------------------------");
console.log(" WARNING: Ensure you have backed up your database.");
console.log(" It is recommended to stop the application before running this script.");
console.log("---------------------------------------------------");

if (isDryRun) {
    console.log("RUNNING IN DRY-RUN MODE. No changes will be saved.");
} else {
    console.log("RUNNING IN LIVE MODE. Changes will be written to DB.");
    // Wait for 5 seconds to give user a chance to cancel
    console.log("Starting in 5 seconds... (Ctrl+C to cancel)");
    // await new Promise(r => setTimeout(r, 5000)); // Can't use await at top level in CommonJS without IIFE wrapper logic shift, putting inside main function
}

async function repairBatches() {
    if (!isDryRun) await new Promise(r => setTimeout(r, 5000));

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const batches = await Batch.find({});
        // Use 'User' to match the model registration
        const allStudentIds = await User.distinct('_id');
        const studentIdSet = new Set(allStudentIds.map(id => id.toString()));
        console.log(`Checking ${batches.length} batches against ${studentIdSet.size} valid students...`);

        let totalRemoved = 0;
        let batchesAffected = 0;

        for (const batch of batches) {
            if (!batch.enrolledStudents || batch.enrolledStudents.length === 0) continue;

            const originalCount = batch.enrolledStudents.length;
            const validEnrollments = batch.enrolledStudents.filter(enrollment => {
                const sId = enrollment.student?._id || enrollment.student;
                if (!sId) return false;
                return studentIdSet.has(sId.toString());
            });

            if (validEnrollments.length !== originalCount) {
                const removedCount = originalCount - validEnrollments.length;
                console.log(`Batch "${batch.name}" (${batch._id}): Found ${removedCount} phantom enrollments.`);

                if (isDryRun) {
                    console.log(`  [DRY-RUN] Would remove ${removedCount} entries. (Current: ${originalCount} -> New: ${validEnrollments.length})`);
                } else {
                    // Atomic Update: Only update if the enrolledStudents list hasn't changed since we read it.
                    // We match by _id and the exact size/content of enrolledStudents effectively by matching the document version if available, 
                    // or crudely by checking if the current DB state still matches our read 'originalCount'.
                    // Better: Use $set with validEnrollments.

                    const result = await Batch.updateOne(
                        { _id: batch._id, 'enrolledStudents': batch.enrolledStudents }, // Optimistic locking via value match
                        { $set: { enrolledStudents: validEnrollments } }
                    );

                    if (result.modifiedCount > 0) {
                        console.log(`  -> Successfully updated. New Count: ${validEnrollments.length}`);
                    } else {
                        console.warn(`  -> FAILED to update batch ${batch._id}. Data may have changed concurrently.`);
                    }
                }
                totalRemoved += removedCount;
                batchesAffected++;
            }
        }

        console.log("---------------------------------------------------");
        console.log(isDryRun ? "Dry Run Complete." : "Repair Complete.");
        console.log(`Batches affected: ${batchesAffected}`);
        console.log(`Total phantom enrollments removed: ${totalRemoved}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

repairBatches();
