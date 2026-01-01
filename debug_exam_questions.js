const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Define minimal schema to avoid importing the whole app
const ExamSchema = new mongoose.Schema({
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
}, { strict: false });

const Exam = mongoose.models.Exam || mongoose.model("Exam", ExamSchema);

async function checkExam() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("No MONGODB_URI found");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Use the ID from the screenshot/url if possible, or list recent exams
        // ID from reasoning: 69551752fd07bc045953cb07 is likely not a valid ObjectId (they are hex, 24 chars).
        // Let's list all exams and their question counts.

        const exams = await Exam.find({}).sort({ updatedAt: -1 }).limit(5);

        console.log("Recent Exams:");
        exams.forEach(e => {
            console.log(`ID: ${e._id}`);
            console.log(`Questions Count: ${e.questions ? e.questions.length : 0}`);
            console.log(`Questions: ${JSON.stringify(e.questions)}`);
            console.log('---');
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkExam();
