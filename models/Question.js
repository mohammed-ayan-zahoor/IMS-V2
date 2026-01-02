import mongoose from 'mongoose';
const { Schema } = mongoose;

const QuestionSchema = new Schema({
    text: { type: String, required: true }, // HTML content allowed
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer', 'essay'],
        required: true
    },
    subject: { type: String },
    classLevel: { type: String }, // e.g., "Grade 10", "Undergraduate"

    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },

    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },

    // MCQ specific
    options: [{ type: String }], // For MCQ (4 options typically)
    correctAnswer: { type: String }, // Validated by hook based on type

    marks: { type: Number, required: true, default: 1, min: 0 },
    explanation: { type: String }, // Optional explanation

    // Metadata
    tags: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },

    // Usage tracking
    timesUsed: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }, // For analytics

    deletedAt: Date
}, { timestamps: true });

QuestionSchema.index({ subject: 1, classLevel: 1, difficulty: 1 });
QuestionSchema.index({ institute: 1, subject: 1, difficulty: 1 });
QuestionSchema.index({ text: 'text', tags: 'text' }); // Full-text search

// Validation is handled in the controller/service layer or by Schema constraints
// Redundant pre('validate') hook removed to prevent middleware errors

// Force recompilation in dev to ensure hooks are cleared
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Question) {
        delete mongoose.models.Question;
    }
}

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);
