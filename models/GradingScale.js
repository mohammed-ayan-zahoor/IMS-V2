import mongoose from 'mongoose';
const { Schema } = mongoose;

const GradingScaleRangeSchema = new Schema({
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true },
    grade: { type: String, required: true, trim: true },
    gradePoint: { type: Number, required: true },
    remarks: { type: String, trim: true } // e.g. "Outstanding", "Excellent"
}, { _id: false });

const GradingScaleSchema = new Schema({
    name: { type: String, required: true, trim: true },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    description: { type: String, trim: true },
    ranges: [GradingScaleRangeSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Ensure unique name per institute
GradingScaleSchema.index({ institute: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.GradingScale;
export default mongoose.models.GradingScale || mongoose.model('GradingScale', GradingScaleSchema);
