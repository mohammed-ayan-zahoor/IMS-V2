import mongoose from 'mongoose';
const { Schema } = mongoose;

const SessionSchema = new Schema({
    sessionName: {
        type: String,
        required: true,
        trim: true,
        // Format: "25-26", "26-27", etc
        match: [/^\d{2}-\d{2}$/, 'Session name must be in format: 25-26'],
        index: true
    },
    
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },

    isActive: {
        type: Boolean,
        default: false,
        index: true
    },

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    // Immutable flag - set to true after creation
    isLocked: {
        type: Boolean,
        default: true,
        description: 'Sessions are immutable after creation'
    },

    // Soft delete
    deletedAt: {
        type: Date,
        default: null,
        index: true
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for unique sessions per institute (non-deleted)
SessionSchema.index({ instituteId: 1, sessionName: 1, deletedAt: 1 }, { unique: true, sparse: true });

// Partial index: only ONE active session allowed per institute at the DB level.
// MongoDB partial indexes only index documents matching the filter expression,
// so inactive sessions (isActive: false) are excluded and don't conflict.
SessionSchema.index(
    { instituteId: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true, deletedAt: null },
        name: 'unique_active_session_per_institute'
    }
);

// Middleware to enforce immutability on closed sessions.
// Only isActive and updatedAt are allowed to change after creation.
SessionSchema.pre('findOneAndUpdate', function(next) {
    this.options.runValidators = true;
    const update = this.getUpdate();
    const set = update?.$set || update || {};
    const forbidden = Object.keys(set).filter(k => !['isActive', 'updatedAt'].includes(k));
    if (forbidden.length > 0) {
        return next(new Error(`Session fields are immutable after creation: ${forbidden.join(', ')}`));
    }
    next();
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
