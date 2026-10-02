import mongoose from 'mongoose';
const { Schema } = mongoose;

const ApprovalRequestSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: ['discount', 'approval_settings']
    },
    resourceType: {
        type: String,
        required: true
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        refPath: 'resourceType',
        required: false
    },
    payload: {
        type: Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    reviewNote: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

ApprovalRequestSchema.index({ institute: 1, status: 1, createdAt: -1 });
ApprovalRequestSchema.index({ resourceType: 1, resourceId: 1, action: 1, status: 1 });

if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.ApprovalRequest) {
        delete mongoose.models.ApprovalRequest;
    }
}

export default mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', ApprovalRequestSchema);
