import Fee from '@/models/Fee';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

// Ensure we have the model
const FeeDb = Fee;

export class FeeService {
    static async createFeeStructure(data, actorId) {
        await connectDB();
        const { student, batch, totalAmount, installments, discount } = data;

        // Validation: Installments must match total
        const installmentSum = installments.reduce((sum, i) => sum + i.amount, 0);
        const finalExpected = totalAmount - (discount?.amount || 0);

        // Allow 1.0 difference for float logic, though pre-save is stricter
        if (Math.abs(installmentSum - finalExpected) > 1.0) {
            throw new Error(`Installment sum (${installmentSum}) does not match total payable (${finalExpected})`);
        }

        const fee = await FeeDb.create({
            student,
            batch,
            totalAmount,
            installments: installments.map(i => ({
                ...i,
                status: 'pending' // Force initial status
            })),
            discount,
            status: 'not_started'
        });

        await createAuditLog({
            actor: actorId,
            action: 'fee.create',
            resource: { type: 'Fee', id: fee._id },
            details: { student, batch, totalAmount }
        });

        return fee;
    }

    static async getFees(filters = {}) {
        await connectDB();
        const query = { deletedAt: null };

        if (filters.batch) query.batch = filters.batch;
        if (filters.status) query.status = filters.status;
        if (filters.student) query.student = filters.student;

        return await FeeDb.find(query)
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('batch', 'name')
            .sort({ createdAt: -1 });
    }

    static async recordPayment(feeId, installmentId, paymentDetails, actorId) {
        await connectDB();
        const fee = await FeeDb.findById(feeId);
        if (!fee) throw new Error("Fee record not found");

        const installment = fee.installments.id(installmentId);
        if (!installment) throw new Error("Installment not found");

        if (installment.status === 'paid') {
            throw new Error("Installment is already paid");
        }

        // Update installment
        installment.status = 'paid';
        installment.paidDate = new Date();
        installment.paymentMethod = paymentDetails.method;
        installment.transactionId = paymentDetails.transactionId;
        installment.notes = paymentDetails.notes;

        // Save triggers the pre-save hook to recalculate totals/status
        await fee.save();

        await createAuditLog({
            actor: actorId,
            action: 'fee.payment',
            resource: { type: 'Fee', id: fee._id },
            details: { installmentId, amount: installment.amount }
        });

        return fee;
    }
}
