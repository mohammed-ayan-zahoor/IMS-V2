import mongoose from "mongoose";

// ExamSchema definition (QuestionSchema removed)
const ExamSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Exam title is required"],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: [true, "Course is required"]
    },
    batches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch"
    }],
    duration: {
        type: Number, // in minutes
        required: [true, "Duration is required"],
        min: 1
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    passingMarks: {
        type: Number,
        required: [true, "Passing marks is required"]
    },
    scheduledAt: {
        type: Date,
        required: [true, "Schedule date is required"]
    },
    endTime: {
        type: Date,
        // Optional: If not set, strictly scheduledAt + duration
    },
    status: {
        type: String,
        enum: ["draft", "published", "completed"],
        default: "draft"
    },
    // Updated: Reference to Question Bank
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    deletedAt: {
        type: Date,
        default: null
    },

    // Security Configuration
    securityConfig: {
        enforceFullscreen: { type: Boolean, default: true },
        allowTabSwitch: { type: Boolean, default: false },
        maxTabSwitches: { type: Number, default: 3 },
        preventCopyPaste: { type: Boolean, default: true },
        preventRightClick: { type: Boolean, default: true },
        randomizeQuestions: { type: Boolean, default: false },
        randomizeOptions: { type: Boolean, default: false }
    },

    // Results Control
    resultsPublished: { type: Boolean, default: false },
    resultsPublishedAt: Date,
    showCorrectAnswers: { type: Boolean, default: true },
    showExplanations: { type: Boolean, default: true },

    // Grading Configuration
    negativeMarking: { type: Boolean, default: false },
    negativeMarkingPercentage: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

// Auto-calculate total marks before save
// Note: This logic now requires population or explicit totalMarks setting since questions are references
ExamSchema.pre('save', async function (next) {
    // If questions are modified, we might want to recalculate totalMarks
    // but we can't easily do sync populate here. 
    // It's better to handle calculation at the Controller level when adding questions.
    next();
});

// Safe export for Next.js hot reloading
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Exam;
export default mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
