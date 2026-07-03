import mongoose from 'mongoose';
const { Schema } = mongoose;

const PhoneCallLogSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    callerName: {
        type: String,
        required: true,
        trim: true
    },
    callerPhone: {
        type: String,
        required: true,
        trim: true
    },
    receiverName: {
        type: String,
        trim: true
    },
    purpose: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    duration: {
        type: Number, // duration in minutes
        default: 0
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
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

PhoneCallLogSchema.index({ institute: 1, deletedAt: 1 });

delete mongoose.models.PhoneCallLog;
export default mongoose.models.PhoneCallLog || mongoose.model('PhoneCallLog', PhoneCallLogSchema);
