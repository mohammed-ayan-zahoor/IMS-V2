import mongoose from 'mongoose';
const { Schema } = mongoose;

const AnswerSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, required: true },
    answer: String,
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0, min: 0 }
});

const ExamSubmissionSchema = new Schema({
    exam: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    answers: [AnswerSchema],
    startedAt: { type: Date, required: true },
    submittedAt: Date,
    score: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'evaluated', 'absent'],
        default: 'in_progress',
        index: true
    },
    remarks: { type: String, maxlength: 1000 },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedAt: Date
}, { timestamps: true });

// Unique constraint: one submission per student per exam
ExamSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

export default mongoose.models.ExamSubmission || mongoose.model('ExamSubmission', ExamSubmissionSchema);
