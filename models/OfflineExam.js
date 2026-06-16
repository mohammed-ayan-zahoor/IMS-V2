import mongoose from 'mongoose';
const { Schema } = mongoose;

const OfflineExamSubjectSchema = new Schema({
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    maxMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    examDate: { type: Date }
}, { _id: true });

const OfflineExamCoScholasticSchema = new Schema({
    paramName: { type: String, required: true, trim: true }, // e.g. "Discipline"
    ratingScale: { type: String, enum: ['A-E', '1-5'], default: 'A-E' }
}, { _id: true });

const OfflineExamSchema = new Schema({
    title: { type: String, required: true, trim: true },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], // If empty, applies to all batches of the course
    
    examType: { 
        type: String, 
        enum: ['unit_test', 'monthly', 'quarterly', 'half_yearly', 'annual', 'pre_board', 'custom'],
        default: 'custom'
    },
    
    gradingScale: { type: Schema.Types.ObjectId, ref: 'GradingScale' },
    weightagePercent: { type: Number, default: 100 },
    isRankEnabled: { type: Boolean, default: true },
    
    subjects: [OfflineExamSubjectSchema],
    coScholastic: [OfflineExamCoScholasticSchema],
    
    status: { 
        type: String, 
        enum: ['draft', 'marks_entry_open', 'published'], 
        default: 'draft',
        index: true
    },
    
    entryDeadline: { type: Date },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

OfflineExamSchema.index({ institute: 1, session: 1, status: 1 });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.OfflineExam;
export default mongoose.models.OfflineExam || mongoose.model('OfflineExam', OfflineExamSchema);
