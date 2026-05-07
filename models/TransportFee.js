import mongoose from 'mongoose';
const { Schema } = mongoose;

const TransportInstallmentSchema = new Schema({
    month: { type: String, required: true },   // "2025-06" (YYYY-MM) or "Q1-2025"
    label: { type: String, required: true },   // "June 2025" or "Q1 2025-26"
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
    collectedBy: String,
    notes: String
});

const TransportFeeSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    route: { type: Schema.Types.ObjectId, ref: 'TransportRoute' },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    preset: { type: Schema.Types.ObjectId, ref: 'TransportFeePreset' },
    billingCycle: { 
        type: String, 
        enum: ['monthly', 'quarterly', 'annual'],
        required: true
    },
    feePerCycle: { type: Number, required: true, min: 0 },
    maxCycles: { type: Number, min: 1 }, // Limit number of billing cycles
    installments: [TransportInstallmentSchema],
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['not_started', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'not_started'
    },
    deletedAt: { type: Date, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Unique: one transport fee per student per session (or per institute if no session)
TransportFeeSchema.index(
    { institute: 1, student: 1, session: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Pre-save hook: auto-calculate paidAmount, balanceAmount, status (mirrors Fee.js pattern)
TransportFeeSchema.pre('save', function () {
    this.paidAmount = (this.installments || [])
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0);

    this.totalAmount = (this.installments || [])
        .reduce((sum, i) => sum + i.amount, 0);

    this.balanceAmount = Math.max(0, this.totalAmount - this.paidAmount);

    // Update status (skip if explicitly cancelled)
    if (this.status !== 'cancelled') {
        if (this.paidAmount < 0.01) {
            this.status = 'not_started';
        } else if (this.balanceAmount < 0.01) {
            this.status = 'paid';
        } else if (this.installments && this.installments.some(i => i.status === 'overdue')) {
            this.status = 'overdue';
        } else {
            this.status = 'partial';
        }
    }
});

export default mongoose.models.TransportFee || mongoose.model('TransportFee', TransportFeeSchema);
