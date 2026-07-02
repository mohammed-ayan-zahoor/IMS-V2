import mongoose from 'mongoose';
const { Schema } = mongoose;

const DesignationSchema = new Schema({
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
    description: {
        type: String,
        trim: true
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

DesignationSchema.index({ institute: 1, name: 1 }, { unique: true });

delete mongoose.models.Designation;

export default mongoose.models.Designation || mongoose.model('Designation', DesignationSchema);
