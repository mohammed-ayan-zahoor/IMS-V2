import mongoose from 'mongoose';
const { Schema } = mongoose;

const PracticeSessionSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'mixed'],
        default: 'mixed'
    },
    questions: [{
        question: { type: Schema.Types.ObjectId, ref: 'Question' },
        userAnswer: String,
        isCorrect: Boolean,
        timeSpent: Number // in seconds
    }],
    totalQuestions: Number,
    correctCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    status: {
        type: String,
        enum: ['in_progress', 'completed'],
        default: 'in_progress'
    }
}, { timestamps: true });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.PracticeSession;
export default mongoose.models.PracticeSession || mongoose.model('PracticeSession', PracticeSessionSchema);
