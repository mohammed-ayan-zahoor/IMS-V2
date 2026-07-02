import mongoose from 'mongoose';
const { Schema } = mongoose;

const PayslipSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    staff: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    attendanceSummary: {
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        halfDay: { type: Number, default: 0 },
        onLeave: { type: Number, default: 0 },
        holiday: { type: Number, default: 0 }
    },
    basicSalary: {
        type: Number,
        required: true,
        min: 0
    },
    earnings: [{
        componentName: String,
        amount: Number
    }],
    deductions: [{
        componentName: String,
        amount: Number
    }],
    netSalary: {
        type: Number,
        required: true,
        min: 0
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    paymentDate: Date,
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque']
    },
    notes: {
        type: String,
        trim: true
    },
    generatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

PayslipSchema.index({ institute: 1, staff: 1, month: 1, year: 1 }, { unique: true });

delete mongoose.models.Payslip;

export default mongoose.models.Payslip || mongoose.model('Payslip', PayslipSchema);
