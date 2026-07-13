import mongoose from 'mongoose';
const { Schema } = mongoose;

const EventSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ['holiday', 'exam', 'cultural', 'academic_assembly', 'sports', 'general'],
        default: 'general',
        index: true
    },
    target: {
        type: String,
        enum: ['all', 'batches', 'courses'],
        default: 'all',
        index: true
    },
    targetIds: [{
        type: Schema.Types.ObjectId,
        index: true
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, {
    timestamps: true
});

// Index for query performance
EventSchema.index({ institute: 1, deletedAt: 1, startDate: 1 });

// Safe export for Next.js hot-reloading
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Event;
export default mongoose.models.Event || mongoose.model('Event', EventSchema);
