import mongoose from 'mongoose';
const { Schema } = mongoose;

const SuspiciousActivitySchema = new Schema({
    submission: {
        type: Schema.Types.ObjectId,
        ref: 'ExamSubmission',
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    exam: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },

    // Event Details
    eventType: {
        type: String,
        enum: [
            'tab_switch',
            'fullscreen_exit',
            'copy_attempt',
            'paste_attempt',
            'right_click',
            'context_menu',
            'dev_tools_open',
            'multiple_sessions',
            'keyboard_shortcut',
            'focus_loss'
        ],
        required: true,
        index: true
    },

    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        index: true
    },

    // Context
    timestamp: { type: Date, default: Date.now, index: true },
    questionId: Schema.Types.ObjectId, // Which question was active
    timeFromStart: Number, // Seconds since exam started

    // Technical Details
    metadata: {
        ipAddress: String,
        userAgent: String,
        screenResolution: String,
        duration: Number, // For tab switches, how long were they away
        clipboardContent: String, // For paste attempts (if captured)
        keySequence: String // For keyboard shortcuts
    },

    // Review Status
    reviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    actionTaken: {
        type: String,
        enum: ['none', 'warning_issued', 'marks_deducted', 'exam_invalidated']
    }
}, { timestamps: true });

// Compound indexes for efficient queries
SuspiciousActivitySchema.index({ exam: 1, severity: 1 });
SuspiciousActivitySchema.index({ student: 1, reviewed: 1 });

export default mongoose.models.SuspiciousActivity ||
    mongoose.model('SuspiciousActivity', SuspiciousActivitySchema);
