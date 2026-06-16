import mongoose from 'mongoose';
const { Schema } = mongoose;

const OfflineExamMarkSchema = new Schema({
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    obtainedMarks: { type: Number, default: null }, // Null if absent/NA
    isAbsent: { type: Boolean, default: false },
    isNotAppeared: { type: Boolean, default: false }, // E.g., transferred in mid-term
    graceMarks: { type: Number, default: 0 },
    remarks: { type: String, trim: true } // Teacher remark for this specific subject
}, { _id: false });

const OfflineExamCoScholasticRatingSchema = new Schema({
    paramName: { type: String, required: true },
    rating: { type: String, required: true } // e.g. "A", "4"
}, { _id: false });

const OfflineExamResultSchema = new Schema({
    exam: { type: Schema.Types.ObjectId, ref: 'OfflineExam', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    
    marks: [OfflineExamMarkSchema],
    coScholasticRatings: [OfflineExamCoScholasticRatingSchema],
    
    // Aggregates
    totalObtainedMarks: { type: Number, default: 0 },
    totalMaxMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    overallGrade: { type: String },
    gradePoint: { type: Number },
    rank: { type: Number },
    
    overallResult: { 
        type: String, 
        enum: ['pass', 'fail', 'compartment', 'promoted'],
        default: 'pass'
    },
    
    isReExam: { type: Boolean, default: false },
    
    teacherRemarks: { type: String, trim: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // User who submitted/published
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Ensure one result per student per exam
OfflineExamResultSchema.index({ exam: 1, student: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.OfflineExamResult;
export default mongoose.models.OfflineExamResult || mongoose.model('OfflineExamResult', OfflineExamResultSchema);
