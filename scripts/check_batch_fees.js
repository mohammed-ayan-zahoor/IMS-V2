const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// minimal schemas
const BatchSchema = new mongoose.Schema({
    name: String,
    enrolledStudents: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String
    }],
    deletedAt: Date
});
const UserSchema = new mongoose.Schema({
    profile: { firstName: String, lastName: String },
    email: String,
    role: String
});
const FeeSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    amount: Number
});

const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Fee = mongoose.models.Fee || mongoose.model('Fee', FeeSchema);

async function checkBatch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find "test batch 1"
        // Note: Regex search to be safe on case/formatting if exact match fails, 
        // but 'test batch 1' was in the log details.
        const batch = await Batch.findOne({ name: 'test batch 1' }).populate('enrolledStudents.student');

        if (!batch) {
            console.log("Batch 'test batch 1' not found.");
            return;
        }

        console.log(`Checking Batch: ${batch.name} (${batch._id})`);
        console.log(`Enrolled Students: ${batch.enrolledStudents.length}`);

        for (const enroll of batch.enrolledStudents) {
            const student = enroll.student;
            if (!student) {
                console.log(`- Null Student Ref`);
                continue;
            }
            const name = `${student.profile?.firstName} ${student.profile?.lastName}`;

            // Checks for Fee
            const fee = await Fee.findOne({ student: student._id, batch: batch._id });

            console.log(`- Student: ${name} (${student.email})`);
            console.log(`  Fee Record: ${fee ? 'FOUND (' + fee._id + ')' : 'MISSING'}`);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkBatch();
