import mongoose from 'mongoose';
const { Schema } = mongoose;

const IncomeSchema = new Schema({
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
    incomeHead: {
        type: Schema.Types.ObjectId,
        ref: 'IncomeHead',
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
    receivedFrom: {
        type: String,
        trim: true
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
        default: 'Cash'
    },
    receivedInAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Collector'
    },
    entryBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

IncomeSchema.index({ institute: 1, date: -1 });
IncomeSchema.index({ institute: 1, incomeHead: 1 });

delete mongoose.models.Income;

export default mongoose.models.Income || mongoose.model('Income', IncomeSchema);
