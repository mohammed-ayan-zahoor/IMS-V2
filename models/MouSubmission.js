import mongoose from 'mongoose';

const MouSubmissionSchema = new mongoose.Schema({
    refId: {
        type: String,
        required: true,
        index: true
    },
    schoolName: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    principalName: {
        type: String,
        required: true,
        trim: true
    },
    designation: {
        type: String,
        trim: true
    },
    contactEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    contactPhone: {
        type: String,
        trim: true
    },
    studentCount: {
        type: Number,
        required: true,
        min: 1
    },
    udiseCode: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    upfrontPrice: {
        type: Number,
        required: true
    },
    action: {
        type: String,
        enum: ['print', 'download_pdf'],
        required: true,
        index: true
    },
    mouDuration: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    signatureDataUrl: {
        type: String // Optional Base64 signature image
    },
    metadata: {
        ip: String,
        userAgent: String,
        screenWidth: Number,
        screenHeight: Number
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'converted', 'rejected'],
        default: 'new',
        index: true
    },
    notes: {
        type: String,
        trim: true
    },
    payments: [{
        amount: { type: Number, required: true },
        paymentMethod: { type: String, required: true, enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'] },
        referenceId: { type: String, trim: true },
        paidDate: { type: Date, default: Date.now },
        notes: { type: String, trim: true }
    }]
}, { timestamps: true });

// Auto-delete compilation model in dev environment if re-imported
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.MouSubmission) {
        delete mongoose.models.MouSubmission;
    }
}

export default mongoose.models.MouSubmission || mongoose.model('MouSubmission', MouSubmissionSchema);
