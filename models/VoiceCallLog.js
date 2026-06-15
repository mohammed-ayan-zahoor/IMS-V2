import mongoose from 'mongoose';
const { Schema } = mongoose;

const VoiceCallLogSchema = new Schema({
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
    phone: {
        type: String,
        required: true
    },
    installmentId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    feeType: {
        type: String,
        enum: ['course', 'transport', 'hostel'],
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    },
    error: {
        type: String
    },
    cost: {
        type: Number,
        default: 0.70
    },
    callSid: {
        type: String
    }
}, { timestamps: true });

// Index for fast reporting & aggregation queries
VoiceCallLogSchema.index({ institute: 1, createdAt: -1 });

export default mongoose.models.VoiceCallLog || mongoose.model('VoiceCallLog', VoiceCallLogSchema);
