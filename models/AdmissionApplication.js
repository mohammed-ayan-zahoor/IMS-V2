import mongoose from 'mongoose';
import { encrypt, decrypt } from '../lib/crypto.js';
const { Schema } = mongoose;

const AdmissionApplicationSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: { type: Date, required: true },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', ''],
        default: ''
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    learningMode: {
        type: String,
        enum: ['Online', 'Offline', 'Hybrid'],
        required: true
    },
    guardian: {
        name: { type: String, required: false, trim: true },
        phone: { type: String, required: false, trim: true },
        relation: {
            type: String,
            enum: ['Father', 'Mother', 'Guardian', 'Other', ''],
            required: false
        }
    },
    parentalConsent: {
        verified: { type: Boolean, default: false },
        verifiedBy: { type: String, enum: ['Father', 'Mother', 'Guardian', 'None'], default: 'None' },
        consentDate: Date,
        consentIpAddress: String
    },
    address: {
        street: { type: String, required: false },
        city: { type: String, required: false },
        state: { type: String, required: false },
        pincode: { type: String, required: false }
    },
    previousEducation: { type: String, trim: true },
    photo: { type: String, trim: true },
    // Family & Identity (Optional)
    fatherName: { type: String, trim: true },
    fatherAadhar: {
        type: String,
        trim: true,
        set: (val) => (val && !val.startsWith('enc:') ? `enc:${encrypt(val)}` : val),
        get: (val) => (val && val.startsWith('enc:') ? decrypt(val.replace(/^enc:/, '')) : val)
    },
    motherName: { type: String, trim: true },
    motherAadhar: {
        type: String,
        trim: true,
        set: (val) => (val && !val.startsWith('enc:') ? `enc:${encrypt(val)}` : val),
        get: (val) => (val && val.startsWith('enc:') ? decrypt(val.replace(/^enc:/, '')) : val)
    },
    studentAadhar: {
        type: String,
        trim: true,
        set: (val) => (val && !val.startsWith('enc:') ? `enc:${encrypt(val)}` : val),
        get: (val) => (val && val.startsWith('enc:') ? decrypt(val.replace(/^enc:/, '')) : val)
    },
    status: {
        type: String,
        enum: ['pending', 'converted', 'cancelled'],
        default: 'pending'
    },
    notes: { type: String, trim: true },
    referredBy: { type: String, trim: true }
}, { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Multi-tenant data isolation and reporting indexes
AdmissionApplicationSchema.index({ email: 1, institute: 1 });
AdmissionApplicationSchema.index({ phone: 1, institute: 1 });

// Performance indexes for reporting queries
AdmissionApplicationSchema.index({ institute: 1, createdAt: -1 }, { name: 'idx_inst_created' });
AdmissionApplicationSchema.index({ institute: 1, status: 1, createdAt: -1 }, { name: 'idx_inst_status_created' });
AdmissionApplicationSchema.index({ institute: 1, course: 1, createdAt: -1 }, { name: 'idx_inst_course_created' });
AdmissionApplicationSchema.index({ institute: 1, createdAt: 1, updatedAt: -1 }, { name: 'idx_inst_timestamps' });

// Sparse index for referral source analysis
AdmissionApplicationSchema.index({ institute: 1, referredBy: 1, createdAt: -1 }, { sparse: true, name: 'idx_inst_referral' });

export default mongoose.models.AdmissionApplication || mongoose.model('AdmissionApplication', AdmissionApplicationSchema);
