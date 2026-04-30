import mongoose from 'mongoose';
const { Schema } = mongoose;

const MaterialSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', index: true }, // Optional for migration support
    title: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 1000 },
    file: {
        url: { type: String, required: true },
        publicId: String, // For Cloudinary
        type: {
            type: String,
            enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'video', 'image', 'zip', 'other'],
            required: true
        },
        size: { type: Number, min: 0 }, // bytes
        originalName: String
    },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }], // Array of courses (backwards compatible with single course)
    course: { type: Schema.Types.ObjectId, ref: 'Course', index: true }, // Kept for backwards compatibility
    batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], // Array of batches across all courses
    visibleToStudents: { type: Boolean, default: true, index: true },
    
    // Assignment Specific Fields
    category: {
        type: String,
        enum: ['lecture', 'assignment', 'reference', 'exam_material', 'other'],
        default: 'lecture'
    },
    allowSubmissions: { type: Boolean, default: false },
    dueDate: { type: Date },
    totalMarks: { type: Number, min: 0 },
    
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    downloadCount: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true }
}, { timestamps: true });

MaterialSchema.index({ course: 1, batches: 1, visibleToStudents: 1 });
MaterialSchema.index({ institute: 1, course: 1, batches: 1 });
MaterialSchema.index({ title: 'text', description: 'text' });

export default mongoose.models.Material || mongoose.model('Material', MaterialSchema);
