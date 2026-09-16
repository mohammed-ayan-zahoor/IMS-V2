import mongoose from 'mongoose';
const { Schema } = mongoose;

const GatePassSchema = new Schema({
    passNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    recipientType: {
        type: String,
        enum: ['staff', 'student'],
        default: 'staff',
        required: true,
        index: true
    },
    // If recipient is a registered User (staff or student with user account)
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    // Optional reference if student model is used directly
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: false,
        index: true
    },
    recipientName: {
        type: String,
        required: true,
        trim: true
    },
    recipientDetails: {
        role: { type: String, default: 'staff' },
        designation: { type: String, default: '' },
        enrollmentNumber: { type: String, default: '' },
        classOrBatch: { type: String, default: '' },
        phone: { type: String, default: '' },
        avatar: { type: String, default: '' }
    },
    requestDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    departureTime: {
        type: String, // e.g. "10:30 AM"
        required: true
    },
    expectedReturnTime: {
        type: String, // e.g. "11:30 AM" or "End of Day"
        required: true
    },
    durationHours: {
        type: String, // e.g. "1 hour", "2 hours", "Rest of Day"
        default: "1 hour"
    },
    category: {
        type: String,
        enum: ['personal_errand', 'sick_medical', 'official_duty', 'emergency', 'parent_pickup', 'other'],
        default: 'personal_errand',
        index: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'DEPARTED', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
    },
    departedAt: {
        type: Date
    },
    returnedAt: {
        type: Date
    },
    securityNotes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Ensure clean cache registration on Next.js dev reloads
if (mongoose.models.GatePass) {
    delete mongoose.models.GatePass;
}

export default mongoose.models.GatePass || mongoose.model('GatePass', GatePassSchema);
