import mongoose from 'mongoose';
const { Schema } = mongoose;

const ComplaintSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    complaintNo: {
        type: String,
        required: true,
        trim: true
    },
    complainantName: {
        type: String,
        required: true,
        trim: true
    },
    complainantPhone: {
        type: String,
        trim: true
    },
    complainantType: {
        type: String,
        enum: ['student', 'parent', 'staff', 'visitor', 'other'],
        default: 'other'
    },
    relatedStudent: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    category: {
        type: String,
        enum: ['academic', 'facility', 'staff', 'fee', 'transport', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: {
        type: String,
        trim: true
    },
    resolvedAt: {
        type: Date
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

ComplaintSchema.index({ institute: 1, deletedAt: 1 });

delete mongoose.models.Complaint;
export default mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
