import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, "Question text is required"],
        trim: true
    },
    type: {
        type: String,
        enum: ["mcq", "descriptive"],
        default: "mcq"
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: [true, "Course is required"],
        index: true
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: [true, "Batch is required"],
        index: true
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
        index: true
    },
    options: {
        type: [String],
        validate: {
            validator: function (v) {
                return this.type === 'mcq' ? v && v.length >= 2 : true;
            },
            message: "MCQ must have at least 2 options"
        }
    },
    correctOption: {
        type: Number,
        validate: {
            validator: function (v) {
                return this.type === 'mcq' ? v !== undefined && v !== null : true;
            },
            message: "Correct option is required for MCQ"
        }
    },
    marks: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Safe export for Next.js hot reloading
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Question;
export default mongoose.models.Question || mongoose.model("Question", QuestionSchema);
