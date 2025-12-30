import mongoose from 'mongoose';
const { Schema } = mongoose;

const InstallmentSchema = new Schema({
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'waived'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque']
    },
    transactionId: String,
    notes: String
});

const FeeSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    totalAmount: { type: Number, required: true, min: 0 },
    discount: {
        amount: { type: Number, default: 0, min: 0 },
        reason: String,
        appliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        appliedAt: Date
    },
    installments: [InstallmentSchema],
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['not_started', 'partial', 'paid', 'overdue'],
        default: 'not_started'
    }
}, { timestamps: true });

// Compound index
FeeSchema.index({ student: 1, batch: 1 }, { unique: true });

// Pre-save hook to calculate balances
FeeSchema.pre('save', function (next) {
    // Validate installment amounts sum
    if (this.installments.length > 0) {
        const installmentsTotal = this.installments.reduce((sum, i) => sum + i.amount, 0);
        const expectedTotal = this.totalAmount - (this.discount?.amount || 0);
        const EPSILON = 0.01; // 1 cent tolerance

        if (Math.abs(installmentsTotal - expectedTotal) > EPSILON) {
            return next(new Error(
                `Installments total (${installmentsTotal}) must equal fee amount after discount (${expectedTotal})`
            ));
        }
    }

    this.paidAmount = this.installments
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0);

    const finalAmount = this.totalAmount - (this.discount?.amount || 0);
    this.balanceAmount = Math.max(0, finalAmount - this.paidAmount);

    // Update status
    const EPSILON = 0.01;
    if (this.paidAmount < EPSILON) {
        this.status = 'not_started';
    } else if (this.balanceAmount < EPSILON) {
        this.status = 'paid';
    } else if (this.installments.some(i => i.status === 'overdue')) {
        this.status = 'overdue';
    } else {
        this.status = 'partial';
    }

    next();
});

export default mongoose.models.Fee || mongoose.model('Fee', FeeSchema);
