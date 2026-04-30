import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubmissionSchema = new Schema({
    assignment: {
        type: Schema.Types.ObjectId,
        ref: 'Material',
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    file: {
        url: { type: String, required: true },
        publicId: String,
        originalName: String,
        size: Number
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'graded', 'returned'],
        default: 'pending',
        index: true
    },
    marksAwarded: {
        type: Number,
        min: 0
    },
    feedback: {
        type: String,
        maxlength: 2000
    },
    gradedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: Date,
    
    // For auto-cleanup logic
    expiresAt: {
        type: Date,
        index: true // Used by TTL index or cleanup script
    }
}, { timestamps: true });

// Ensure a student can only submit once per assignment (or overwrite)
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Safe export for Next.js hot reloading
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Submission;
export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
