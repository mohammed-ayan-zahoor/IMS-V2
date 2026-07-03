import mongoose from 'mongoose';
const { Schema } = mongoose;

const StudentTimelineSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
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
    description: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    category: {
        type: String,
        enum: ['achievement', 'disciplinary', 'milestone', 'general'],
        required: true,
        default: 'general'
    },
    photoUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['approved', 'pending'],
        required: true,
        default: 'approved'
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

StudentTimelineSchema.index({ student: 1, institute: 1, deletedAt: 1 });

delete mongoose.models.StudentTimeline;
export default mongoose.models.StudentTimeline || mongoose.model('StudentTimeline', StudentTimelineSchema);
