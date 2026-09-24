import mongoose from 'mongoose';
const { Schema } = mongoose;

const HRSettingsSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        unique: true,
        index: true
    },
    // Standard Shift Timings
    shiftStart: {
        type: String,
        default: '09:00',
        trim: true
    },
    shiftEnd: {
        type: String,
        default: '18:00',
        trim: true
    },
    // Check-In Rules
    checkInGraceMins: {
        type: Number,
        default: 15,
        min: 0
    },
    // Check-Out Rules
    checkOutGraceMins: {
        type: Number,
        default: 10,
        min: 0
    },
    // Common hourly deduction rate (applied to late-in, early-out, mid-day out-pass in full 1-hour blocks)
    deductionRatePerHour: {
        type: Number,
        default: 100,
        min: 0
    },
    // Mid-Day Out-Pass Deduction Toggle
    midDayOutEnabled: {
        type: Boolean,
        default: true
    },
    // Overtime Rules
    overtimeEnabled: {
        type: Boolean,
        default: true
    },
    overtimeBufferMins: {
        type: Number,
        default: 30,
        min: 0
    },
    overtimeRatePerHour: {
        type: Number,
        default: 150,
        min: 0
    }
}, { timestamps: true });

delete mongoose.models.HRSettings;

export default mongoose.models.HRSettings || mongoose.model('HRSettings', HRSettingsSchema);
