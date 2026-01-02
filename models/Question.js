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
    options: {
        type: [String],
        validate: {
            validator: function (v) {
                if (this.type === 'mcq') {
                    return Array.isArray(v) && v.length >= 2;
                }
                return true;
            },
            message: 'MCQ must have at least 2 options.'
        }
    },
    correctAnswer: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                if (this.type === 'mcq') {
                    if (!this.options || this.options.length === 0) return false;
                    const idx = Number(v);
                    return !isNaN(idx) && idx >= 0 && idx < this.options.length;
                }
                if (this.type === 'true_false') {
                    return v === 'true' || v === 'false';
                }
                return true;
            },
            message: 'Invalid correct answer for the selected question type.'
        }
    },

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
