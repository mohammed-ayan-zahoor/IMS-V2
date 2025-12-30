import mongoose from 'mongoose';
const { Schema } = mongoose;

const MaterialSchema = new Schema({
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
    category: {
        type: String,
        enum: ['lecture', 'assignment', 'reference', 'exam_material', 'other'],
        default: 'lecture'
    },
    course: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    visibleToStudents: { type: Boolean, default: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    downloadCount: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true }
}, { timestamps: true });

MaterialSchema.index({ course: 1, batch: 1, visibleToStudents: 1 });
MaterialSchema.index({ title: 'text', description: 'text' });

export default mongoose.models.Material || mongoose.model('Material', MaterialSchema);
