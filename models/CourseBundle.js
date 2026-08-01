import mongoose from 'mongoose';
const { Schema } = mongoose;

const CourseBundleSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 2000,
        trim: true
    },
    courses: [{
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }],
    bundlePrice: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

// Compound index: unique code per institute (excluding soft-deleted)
CourseBundleSchema.index(
    { institute: 1, code: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } }
);

delete mongoose.models.CourseBundle;
export default mongoose.model('CourseBundle', CourseBundleSchema);
