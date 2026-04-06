import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExpenseSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    expenseHead: {
        type: Schema.Types.ObjectId,
        ref: 'ExpenseHead',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    paidTo: {
        type: String,
        trim: true
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
        default: 'Cash'
    },
    paidByAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Collector'
    },
    entryBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

ExpenseSchema.index({ institute: 1, date: -1 });
ExpenseSchema.index({ institute: 1, expenseHead: 1 });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);