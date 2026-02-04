import mongoose from 'mongoose';
const { Schema } = mongoose;

const AnswerSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, required: true },
    answer: String, // Student's answer (option index for MCQ, text for short answer)
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0, min: 0 },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // For manual grading
    gradedAt: Date,
    feedback: String // Grader's feedback on the answer
});

const SuspiciousEventSchema = new Schema({
    type: {
        type: String,
        enum: [
            'tab_switch',
            'fullscreen_exit',
            'copy_attempt',
            'paste_attempt',
            'right_click',
            'context_menu',
            'dev_tools_open',
            'multiple_sessions'
        ],
        required: true
    },
    timestamp: { type: Date, default: Date.now },
    metadata: Schema.Types.Mixed // Additional context (e.g., duration away, IP address)
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

    // Answer Management
    answers: [AnswerSchema],
    draftAnswers: [AnswerSchema], // Auto-saved drafts
    lastAutoSaveAt: Date,

    // Timing
    startedAt: { type: Date, required: true },
    submittedAt: Date,
    timeSpentSeconds: { type: Number, default: 0 }, // Actual time spent

    // Scoring
    score: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },

    // Status Management
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'evaluated', 'absent', 'flagged'],
        default: 'in_progress',
        index: true
    },

    // Grading
    remarks: { type: String, maxlength: 1000 },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedAt: Date,

    // Security & Integrity
    suspiciousEvents: [SuspiciousEventSchema],
    flaggedForReview: { type: Boolean, default: false, index: true },
    reviewNotes: String,

    // Metadata
    ipAddress: String,
    userAgent: String,
    browserFingerprint: String, // Optional: for multi-device detection

    attemptNumber: { type: Number, default: 1, min: 1, required: true }
}, { timestamps: true });

// Unique constraint: one submission per student per exam per attempt
ExamSubmissionSchema.index({ exam: 1, student: 1, attemptNumber: 1 }, { unique: true });
ExamSubmissionSchema.index({ exam: 1, student: 1 }); // Optimized lookup for all attempts

// Virtual: Total suspicious events count
ExamSubmissionSchema.virtual('suspiciousEventCount').get(function () {
    return this.suspiciousEvents.length;
});

// Method: Check if needs manual grading
ExamSubmissionSchema.methods.needsManualGrading = function () {
    return this.answers.some(a => !a.gradedBy && a.marksAwarded === 0);
};

// Pre-save: Auto-flag if suspicious activity exceeds threshold
ExamSubmissionSchema.pre('save', function () {
    if (this.suspiciousEvents) {
        const criticalEvents = ['multiple_sessions', 'dev_tools_open'];
        const hasCriticalEvent = this.suspiciousEvents.some(e =>
            criticalEvents.includes(e.type)
        );

        if (hasCriticalEvent || this.suspiciousEvents.length > 10) {
            this.flaggedForReview = true;
        }
    }
});

// Safe export for Next.js hot reloading
if (process.env.NODE_ENV !== 'production') delete mongoose.models.ExamSubmission;
export default mongoose.models.ExamSubmission ||
    mongoose.model('ExamSubmission', ExamSubmissionSchema);
