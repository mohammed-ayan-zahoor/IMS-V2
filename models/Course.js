import mongoose from 'mongoose';
const { Schema } = mongoose;

const CourseSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    name: { type: String, required: true, trim: true },
    code: {
        type: String,
        required: true,
        // unique: true, // Moved to compound index
        uppercase: true,
        match: [/^[A-Z0-9]+$/, 'Course code must be alphanumeric']
    },
    description: { type: String, maxlength: 2000 },
    duration: {
        value: { type: Number, required: true, min: 1 },
        unit: { type: String, enum: ['days', 'weeks', 'months'], default: 'months' }
    },
    fees: {
        amount: { type: Number, required: true, min: 0 },
        currency: {
            type: String,
            enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
            default: 'INR'
        }
    },
    syllabus: [{ type: String, trim: true }],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, { timestamps: true });

CourseSchema.index({ name: 'text', code: 'text' });
CourseSchema.index({ institute: 1, code: 1 }, { unique: true }); // Code unique per institute

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
