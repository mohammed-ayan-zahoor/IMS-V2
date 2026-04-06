import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExpenseHeadSchema = new Schema({
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
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

ExpenseHeadSchema.index({ institute: 1, name: 1 }, { unique: true });

export default mongoose.models.ExpenseHead || mongoose.model('ExpenseHead', ExpenseHeadSchema);