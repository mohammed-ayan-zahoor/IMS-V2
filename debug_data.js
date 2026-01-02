const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define minimal schemas to avoid loading full models with hooks/dependencies
const StudentSchema = new mongoose.Schema({
    profile: { firstName: String, lastName: String },
    email: String,
    deletedAt: Date
});
const BatchSchema = new mongoose.Schema({
    name: String,
    enrolledStudents: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String
    }]
});

const Student = mongoose.models.User || mongoose.model('User', StudentSchema);
// Force collection name 'batches' if not inferred correctly, but typically it's pluralized.
// BatchService uses 'Batch' model. List likely 'batches'.
const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);

async function inspectData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const students = await Student.find({ role: 'student' }).lean();
        console.log(`\nTotal Students Found: ${students.length}`);
        students.forEach(s => {
            console.log(`- [${s._id}] ${s.profile?.firstName} ${s.profile?.lastName} (${s.email}) | Deleted: ${s.deletedAt ? 'YES' : 'No'}`);
        });

        const batches = await Batch.find({}).lean();
        console.log(`\nTotal Batches Found: ${batches.length}`);

        for (const b of batches) {
            console.log(`\nBatch: ${b.name} (${b._id})`);
            console.log(`Occupancy (enrolledStudents.length): ${b.enrolledStudents?.length || 0}`);

            if (b.enrolledStudents && b.enrolledStudents.length > 0) {
                console.log("Enrolled IDs:");
                for (const enrollment of b.enrolledStudents) {
                    const sId = enrollment.student;
                    const studentExists = students.find(s => s._id.toString() === sId.toString());
                    console.log(`  - Student ID: ${sId} -> Exists in Users? ${studentExists ? 'YES (' + (studentExists.profile?.firstName || 'N/A') + ')' : 'NO (Dangling Reference)'}`);
                }
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectData();
