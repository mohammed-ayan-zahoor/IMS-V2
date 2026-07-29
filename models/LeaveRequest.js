import mongoose from 'mongoose';
const { Schema } = mongoose;

const LeaveRequestSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    leaveType: {
        type: Schema.Types.ObjectId,
        ref: 'LeaveType',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    adminComment: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Ensure clean cache registration on Next.js dev reloads
if (mongoose.models.LeaveRequest) {
    delete mongoose.models.LeaveRequest;
}

export default mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
