import mongoose from 'mongoose';
const { Schema } = mongoose;

const NoticeSchema = new Schema({
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
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'event', 'urgent', 'success'],
        default: 'info'
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
    priority: {
        type: Number,
        default: 0 // higher is more important
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        index: true
    },
    attachments: [{
        name: String,
        url: String,
        publicId: String
    }]
}, { 
    timestamps: true 
});

// For automatic cleanup of expired notices
NoticeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Safe export for Next.js
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Notice;
export default mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
