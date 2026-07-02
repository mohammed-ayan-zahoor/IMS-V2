import mongoose from 'mongoose';
const { Schema } = mongoose;

const LeaveTypeSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    description: {
        type: String,
        trim: true
    },
    maxDaysPerYear: {
        type: Number,
        required: true,
        min: 0,
        default: 12
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

LeaveTypeSchema.index({ institute: 1, name: 1 }, { unique: true });
LeaveTypeSchema.index({ institute: 1, code: 1 }, { unique: true });

delete mongoose.models.LeaveType;

export default mongoose.models.LeaveType || mongoose.model('LeaveType', LeaveTypeSchema);
