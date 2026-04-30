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
        name: { type: String, required: false, trim: true },
        phone: { type: String, required: false, trim: true },
        relation: {
            type: String,
            enum: ['Father', 'Mother', 'Guardian', 'Other', ''],
            required: false
        }
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
    fatherAadhar: { type: String, trim: true },
    motherName: { type: String, trim: true },
    motherAadhar: { type: String, trim: true },
    studentAadhar: { type: String, trim: true },
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
