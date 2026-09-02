import mongoose from 'mongoose';
const { Schema } = mongoose;

const DepartmentSchema = new Schema({
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
        uppercase: true,
        trim: true,
        match: [/^[A-Z0-9_-]+$/, 'Department code must be alphanumeric with hyphens or underscores']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    hod: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    establishedYear: {
        type: Number,
        min: 1800,
        max: 2100
    },
    contactEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    contactPhone: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, {
    timestamps: true
});

// Unique code per institute for non-deleted departments
DepartmentSchema.index(
    { institute: 1, code: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Department;
export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
