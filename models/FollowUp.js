import mongoose from 'mongoose';
const { Schema } = mongoose;

const FollowUpSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    staff: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    method: {
        type: String,
        enum: ['call', 'whatsapp', 'visit', 'email', 'other'],
        default: 'call',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'promised_payment', 'not_reachable', 'requested_callback', 'refused', 'paid'],
        default: 'pending',
        required: true
    },
    response: {
        type: String,
        required: true,
        trim: true
    },
    nextActionDate: {
        type: Date
    }
}, { timestamps: true });

// Ensure student is correctly indexed for faster retrieval
FollowUpSchema.index({ student: 1, date: -1 });

export default mongoose.models.FollowUp || mongoose.model('FollowUp', FollowUpSchema);
