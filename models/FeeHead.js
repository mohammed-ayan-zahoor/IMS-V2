import mongoose from 'mongoose';
const { Schema } = mongoose;

const FeeHeadSchema = new Schema({
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
    }, // e.g. "Tuition Fee", "Books & Study Material", "School Uniform"
    code: {
        type: String,
        trim: true,
        uppercase: true
    }, // e.g. "TUITION", "BOOKS", "UNIFORM", "LAB"
    category: {
        type: String,
        enum: ['tuition', 'books', 'uniform', 'activity', 'lab', 'exam', 'transport', 'hostel', 'other'],
        default: 'other'
    },
    // When true, newly created itemized classes pre-select this fee head by default
    isDefaultApplied: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Ensure unique active name per institute
FeeHeadSchema.index({ institute: 1, name: 1, deletedAt: 1 }, { unique: true });

delete mongoose.models.FeeHead;
export default mongoose.models.FeeHead || mongoose.model('FeeHead', FeeHeadSchema);
