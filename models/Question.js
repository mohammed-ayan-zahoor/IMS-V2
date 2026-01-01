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
    subject: { type: String, required: true },
    classLevel: { type: String, required: true }, // e.g., "Grade 10", "Undergraduate"
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

QuestionSchema.pre('validate', function (next) {
    if (this.type === 'mcq') {
        if (!this.options || this.options.length < 2) {
            this.invalidate('options', 'MCQ must have at least 2 options');
        }
        const index = parseInt(this.correctAnswer);
        if (isNaN(index) || index < 0 || index >= this.options.length) {
            this.invalidate('correctAnswer', 'MCQ correct answer must be a valid option index');
        }
    } else if (this.type === 'true_false') {
        if (this.correctAnswer !== 'true' && this.correctAnswer !== 'false') {
            this.invalidate('correctAnswer', 'True/False answer must be "true" or "false"');
        }
    } else if (this.type !== 'essay' && !this.correctAnswer) {
        // Short Answer requires answer? Usually yes.
        this.invalidate('correctAnswer', 'Correct answer is required');
    }
    next();
});

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);
