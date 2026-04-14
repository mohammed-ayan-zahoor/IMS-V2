import mongoose from 'mongoose';
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
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        relation: {
            type: String,
            enum: ['Father', 'Mother', 'Guardian', 'Other'],
            required: true
        }
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    previousEducation: { type: String, trim: true },
    photo: { type: String, trim: true },
    status: {
        type: String,
        enum: ['pending', 'converted', 'cancelled'],
        default: 'pending'
    },
    notes: { type: String, trim: true },
    referredBy: { type: String, trim: true }
}, { timestamps: true });

AdmissionApplicationSchema.index({ email: 1, institute: 1 });
AdmissionApplicationSchema.index({ phone: 1, institute: 1 });

export default mongoose.models.AdmissionApplication || mongoose.model('AdmissionApplication', AdmissionApplicationSchema);
