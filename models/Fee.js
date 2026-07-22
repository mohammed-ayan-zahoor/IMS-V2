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
    collectedBy: String,
    notes: String,
    voiceReminderSentAt: Date,
    penaltyAmount: { type: Number, default: 0 },
    penaltyPaid: { type: Number, default: 0 },
    penaltyStatus: { type: String, enum: ['none', 'pending', 'paid'], default: 'none' }
});

const FeeSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    session: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        index: true,
        description: 'Academic session for this fee'
    },
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
    extraCharges: {
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
        enum: ['not_started', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
        default: 'not_started'
    },
    // Soft delete
    deletedAt: { type: Date, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    feePreset: {
        type: Schema.Types.ObjectId,
        ref: 'FeePreset'
    },
    carryForward: {
        isCarriedForward: { type: Boolean, default: false },
        fromFee: { type: Schema.Types.ObjectId, ref: 'Fee' },
        fromSession: { type: Schema.Types.ObjectId, ref: 'Session' },
        fromBatch: { type: Schema.Types.ObjectId, ref: 'Batch' },
        note: String
    },
    penaltyConfig: {
        enabled: { type: Boolean, default: false },
        type: { type: String, enum: ['flat', 'daily'], default: 'flat' },
        amount: { type: Number, default: 0 },
        offsetDays: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Compound index: Unique only if feePreset is defined (allows custom/carry-forward fees alongside preset fees)
FeeSchema.index(
    { institute: 1, student: 1, batch: 1, feePreset: 1 },
    { 
        unique: true, 
        partialFilterExpression: { 
            deletedAt: null, 
            feePreset: { $exists: true } 
        } 
    }
);
// Pre-save hook to calculate balances
FeeSchema.pre('save', async function () {
    // Auto-balance and validate installment amounts sum
    if (this.installments && this.installments.length > 0) {
        const expectedTotal = this.totalAmount - (this.discount?.amount || 0) + (this.extraCharges?.amount || 0);
        let installmentsTotal = this.installments.reduce((sum, i) => sum + i.amount, 0);
        let diff = expectedTotal - installmentsTotal;
        const EPSILON = 0.01;

        if (Math.abs(diff) > EPSILON) {
            const pending = this.installments.filter(i => i.status === 'pending');

            if (pending.length > 0) {
                if (diff > 0) {
                    // Extra charge applied -> add to pending
                    const share = Math.floor((diff / pending.length) * 100) / 100;
                    const remainder = Math.round((diff - (share * pending.length)) * 100) / 100;
                    
                    pending.forEach((inst, idx) => {
                        inst.amount = Math.round((inst.amount + share + (idx === 0 ? remainder : 0)) * 100) / 100;
                    });
                } else {
                    // Discount applied -> reduce from pending
                    let absDiff = Math.abs(diff);
                    
                    for (let inst of pending) {
                        if (absDiff <= 0) break;
                        if (inst.amount >= absDiff) {
                            inst.amount = Math.round((inst.amount - absDiff) * 100) / 100;
                            absDiff = 0;
                        } else {
                            absDiff = Math.round((absDiff - inst.amount) * 100) / 100;
                            inst.amount = 0;
                        }
                    }

                    // Remove any pending installments that reached 0
                    this.installments = this.installments.filter(i => i.status !== 'pending' || i.amount > 0.01);

                    if (absDiff > 0.01) {
                        throw new Error(`Discount exceeds the remaining unpaid installment balance (₹${(installmentsTotal - this.installments.filter(i => i.status === 'paid').reduce((sum, x) => sum + x.amount, 0)).toLocaleString()})`);
                    }
                }
            } else {
                // All installments are already paid!
                if (diff > 0) {
                    const today = new Date();
                    const nextMonth = new Date(today);
                    nextMonth.setMonth(today.getMonth() + 1);

                    this.installments.push({
                        amount: Math.round(diff * 100) / 100,
                        dueDate: nextMonth,
                        status: 'pending'
                    });
                } else {
                    throw new Error("Cannot apply discount because this fee is already fully paid.");
                }
            }

            // Recalculate installments total after auto-balancing
            installmentsTotal = this.installments.reduce((sum, i) => sum + i.amount, 0);
        }

        if (Math.abs(installmentsTotal - expectedTotal) > EPSILON) {
            throw new Error(
                `Installments total (${installmentsTotal}) must equal fee amount after discount and extra charges (${expectedTotal})`
            );
        }
    }

    this.paidAmount = (this.installments || [])
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0);

    const finalAmount = this.totalAmount - (this.discount?.amount || 0) + (this.extraCharges?.amount || 0);
    this.balanceAmount = Math.max(0, finalAmount - this.paidAmount);

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

function applyPenalties(doc) {
    if (!doc.penaltyConfig || !doc.penaltyConfig.enabled) return;
    const { type, amount, offsetDays } = doc.penaltyConfig;
    const now = new Date();
    if (doc.installments && Array.isArray(doc.installments)) {
        doc.installments.forEach(inst => {
            if (inst.status === 'paid' || inst.status === 'waived') {
                inst.penaltyAmount = inst.penaltyPaid || 0;
                return;
            }
            const dueDate = new Date(inst.dueDate);
            const graceDate = new Date(dueDate.getTime() + (offsetDays * 24 * 60 * 60 * 1000));
            if (now > graceDate) {
                let penalty = 0;
                if (type === 'flat') {
                    penalty = amount;
                } else if (type === 'daily') {
                    const diffTime = Math.abs(now - dueDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    penalty = Math.max(0, diffDays - offsetDays) * amount;
                }
                inst.penaltyAmount = penalty;
                inst.penaltyStatus = 'pending';
            } else {
                inst.penaltyAmount = 0;
                inst.penaltyStatus = 'none';
            }
        });
    }
}

FeeSchema.post('init', function (doc) {
    applyPenalties(doc);
});

FeeSchema.post('save', function (doc) {
    applyPenalties(doc);
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Fee;
export default mongoose.models.Fee || mongoose.model('Fee', FeeSchema);
