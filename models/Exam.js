import mongoose from 'mongoose';
const { Schema } = mongoose;

const QuestionSchema = new Schema({
    questionText: { type: String, required: true },
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer'],
        default: 'mcq'
    },
    options: [{ type: String, trim: true }], // For MCQ only
    correctAnswer: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }, // Number index (0-3) for MCQ, String for others
    marks: { type: Number, default: 1, min: 0 },
    explanation: { type: String, maxlength: 1000 }
});

// Add validation for question types
QuestionSchema.pre('validate', function (next) {
    if (this.type === 'mcq') {
        if (!this.options || this.options.length !== 4) {
            return next(new Error('MCQ questions must have exactly 4 options'));
        }
        const answerIndex = Number(this.correctAnswer);
        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
            return next(new Error('MCQ correctAnswer must be a valid index (0-3)'));
        }
    } else if (this.type === 'true_false') {
        if (this.correctAnswer !== 'true' && this.correctAnswer !== 'false') {
            return next(new Error('True/False correctAnswer must be "true" or "false"'));
        }
    }
    next();
});

const ExamSchema = new Schema({
    title: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    duration: { type: Number, required: true, min: 1 }, // minutes
    totalMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    questions: [QuestionSchema],
    schedule: {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true }
    },
    instructions: { type: String, maxlength: 2000 },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ExamSchema.index({ batch: 1, isPublished: 1 });
ExamSchema.index({ 'schedule.startTime': 1 });

// Validation: endTime must be after startTime
ExamSchema.pre('save', function (next) {
    if (this.schedule.endTime <= this.schedule.startTime) {
        return next(new Error('End time must be after start time'));
    }
    if (this.passingMarks > this.totalMarks) {
        return next(new Error('Passing marks cannot exceed total marks'));
    }
    next();
});

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
