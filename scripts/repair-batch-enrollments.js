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
const Student = mongoose.models.User || mongoose.model('User', StudentSchema);

async function repairBatches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const batches = await Batch.find({});
        const allStudentIds = await Student.find({}).distinct('_id');
        const studentIdSet = new Set(allStudentIds.map(id => id.toString()));

        console.log(`Checking ${batches.length} batches against ${studentIdSet.size} valid students...`);

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
                console.log(`Batch "${batch.name}" (${batch._id}): Removing ${removedCount} phantom enrollments.`);

                batch.enrolledStudents = validEnrollments;
                await batch.save();
                console.log(`  -> Saved. New Count: ${batch.enrolledStudents.length}`);
            }
        }
        console.log("Repair complete.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

repairBatches();
