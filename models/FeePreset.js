import mongoose from 'mongoose';
const { Schema } = mongoose;

const FeePresetSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    // New Fields: Subject Linking & Categorization
    subjects: [{
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        index: true
    }],
    category: {
        type: String,
        enum: ['science', 'commerce', 'arts', 'vocational', 'general'],
        default: 'general'
    },
    complexity: {
        type: String,
        enum: ['basic', 'standard', 'advanced'],
        default: 'standard'
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

// Index for faster queries
FeePresetSchema.index({ institute: 1, course: 1, deletedAt: 1 });

// Delete cached model to prevent stale schema issues during Next.js hot-reloads
delete mongoose.models.FeePreset;
export default mongoose.model('FeePreset', FeePresetSchema);
