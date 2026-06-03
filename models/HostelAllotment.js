import mongoose from 'mongoose';
const { Schema } = mongoose;

const HostelInstallmentSchema = new Schema({
    month: { type: String, required: true },   // "2026-06" (YYYY-MM) or "Q1-2026"
    label: { type: String, required: true },   // "June 2026" or "Q1 2026-27"
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

const HostelAllotmentSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    session: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    room: {
        type: Schema.Types.ObjectId,
        ref: 'HostelRoom',
        required: true
    },
    block: {
        type: Schema.Types.ObjectId,
        ref: 'HostelBlock',
        required: true,
        index: true
    },
    allotmentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    vacatingDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'vacated', 'suspended'],
        default: 'active',
        index: true
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual'],
        required: true
    },
    feePerCycle: {
        type: Number,
        required: true,
        min: 0
    },
    installments: [HostelInstallmentSchema],
    paidAmount: {
        type: Number,
        default: 0
    },
    balanceAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    feeStatus: {
        type: String,
        enum: ['not_started', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'not_started',
        index: true
    },
    notes: {
        type: String,
        trim: true
    },
    allottedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

// Compound index to ensure a student only has one active allotment per session
HostelAllotmentSchema.index(
    { institute: 1, student: 1, session: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null, status: 'active' } }
);

// Pre-save hook: auto-calculate paidAmount, balanceAmount, totalAmount, feeStatus (mirrors TransportFee pattern)
HostelAllotmentSchema.pre('save', async function () {
    this.paidAmount = (this.installments || [])
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0);

    this.totalAmount = (this.installments || [])
        .reduce((sum, i) => sum + i.amount, 0);

    this.balanceAmount = Math.max(0, this.totalAmount - this.paidAmount);

    // Update status (skip if explicitly cancelled)
    if (this.feeStatus !== 'cancelled') {
        if (this.paidAmount < 0.01) {
            this.feeStatus = 'not_started';
        } else if (this.balanceAmount < 0.01) {
            this.feeStatus = 'paid';
        } else if (this.installments && this.installments.some(i => i.status === 'overdue')) {
            this.feeStatus = 'overdue';
        } else {
            this.feeStatus = 'partial';
        }
    }
});

// In Next.js dev, mongoose.models caches the OLD schema/hooks across hot-reloads.
// Delete and re-register to ensure the latest schema is always used.
if (mongoose.models.HostelAllotment) {
    delete mongoose.models.HostelAllotment;
}

export default mongoose.model('HostelAllotment', HostelAllotmentSchema);

