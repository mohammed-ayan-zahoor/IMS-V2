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

// Partial index for active sessions per institute
SessionSchema.index({ instituteId: 1, isActive: 1, deletedAt: 1 });

// Middleware to prevent updates
SessionSchema.pre('findByIdAndUpdate', function(next) {
    // Sessions are immutable - only allow status changes via dedicated endpoint
    this.options.runValidators = true;
    next();
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
