import mongoose from 'mongoose';
const { Schema } = mongoose;

const PlatformTransactionSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    razorpayPaymentId: {
        type: String,
        index: true,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'captured', 'failed'],
        default: 'pending',
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    slots: {
        type: Number,
        required: true
    },
    studentsAdded: {
        type: Number,
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

export default mongoose.models.PlatformTransaction || mongoose.model('PlatformTransaction', PlatformTransactionSchema);
