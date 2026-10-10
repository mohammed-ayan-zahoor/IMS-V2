import mongoose from 'mongoose';
const { Schema } = mongoose;

const StudentAccessTransactionSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    academicSession: {
        type: Schema.Types.ObjectId,
        ref: 'Session'
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
        enum: ['created', 'captured', 'failed', 'refunded'],
        default: 'created',
        index: true
    },
    baseAmount: {
        type: Number,
        required: true
    },
    gstAmount: {
        type: Number,
        required: true
    },
    gatewayFee: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    validFrom: {
        type: Date
    },
    validUntil: {
        type: Date,
        required: true
    },
    invoiceNumber: {
        type: String,
        index: true
    },
    paymentMethod: {
        type: String,
        default: null
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.StudentAccessTransaction;
export default mongoose.models.StudentAccessTransaction || mongoose.model('StudentAccessTransaction', StudentAccessTransactionSchema);
