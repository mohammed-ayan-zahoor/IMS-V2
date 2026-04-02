import Fee from '@/models/Fee';
import Batch from '@/models/Batch';
import User from '@/models/User';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

// Ensure we have the model
const FeeDb = Fee;

// Helper to safely get student name
const getStudentName = (student) => {
    if (!student) return 'Unknown Student';
    if (student.profile && (student.profile.firstName || student.profile.lastName)) {
        return `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim();
    }
    return student.displayName || student.email || 'Unknown Student';
};

// Helper to validate dates
const parseValidDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format provided: ${dateString}`);
    }
    return date;
};

// Helper to map a fee document to the unified result shape
const mapFeeToResult = (fee) => ({
    _id: fee._id,
    student: fee.student,
    batch: fee.batch,
    totalAmount: fee.totalAmount || 0,
    paidAmount: fee.paidAmount || 0,
    balanceAmount: fee.balanceAmount || 0,
    percentagePaid: calculatePercentage(fee.paidAmount || 0, fee.totalAmount || 0),
    hasFeeRecord: true,
    installments: fee.installments || [],
    status: fee.status
});

// Helper to apply percentage filter (< threshold)
const applyPercentageFilter = (results, percentage) => {
    if (!percentage || isNaN(percentage)) return results;
    const threshold = parseFloat(percentage);
    return results.filter(r => r.percentagePaid < threshold);
};

// Helper to safely calculate percentage
const calculatePercentage = (paid, total) => {
    if (!total || total <= 0) return 0;
    return (paid / total) * 100;
};

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

        if (!data.institute) throw new Error("Institute context missing"); // Validate here if not checked before

        const fee = await FeeDb.create({
            student,
            batch,
            totalAmount,
            installments: installments.map(i => ({
                ...i,
                status: 'pending' // Force initial status
            })),
            discount,
            status: 'not_started',
            institute: data.institute
        });

        await createAuditLog({
            actor: actorId,
            action: 'fee.create',
            resource: { type: 'Fee', id: fee._id },
            institute: data.institute,
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
        if (filters.institute) query.institute = filters.institute;

        // Exclude cancelled fees unless explicitly requested
        if (!filters.includeCancelled && !filters.status) {
            query.status = { $ne: 'cancelled' };
        }

        return await FeeDb.find(query)
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('batch', 'name')
            .sort({ createdAt: -1 });
    }

    static async getFeesWithStudents(filters = {}) {
        await connectDB();

        // 1. Fetch fee documents with existing logic
        const feeQuery = { deletedAt: null };
        if (filters.batch) feeQuery.batch = filters.batch;
        if (filters.institute) feeQuery.institute = filters.institute;

        // Exclude cancelled fees unless explicitly requested
        if (!filters.includeCancelled) {
            feeQuery.status = { $ne: 'cancelled' };
        }

        const fees = await FeeDb.find(feeQuery)
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('batch', 'name')
            .sort({ createdAt: -1 });

        // 2. If no course/batch filter, return fees as-is (existing behavior)
        if (!filters.course && !filters.batch) {
            const mapped = fees.map(fee => mapFeeToResult(fee));
            return applyPercentageFilter(mapped, filters.percentage);
        }

        // 3. Find batches matching the course/institute filter
        const batchQuery = { deletedAt: null };
        if (filters.course) batchQuery.course = filters.course;
        if (filters.batch) batchQuery._id = filters.batch;
        if (filters.institute) batchQuery.institute = filters.institute;

        const batches = await Batch.find(batchQuery).select('enrolledStudents name');

        // 4. Collect all active enrolled student IDs across matching batches
        const studentBatchMap = {}; // studentId -> { batchId, batchName }
        for (const batch of batches) {
            for (const enrollment of (batch.enrolledStudents || [])) {
                if (enrollment.status === 'active') {
                    const sid = enrollment.student.toString();
                    studentBatchMap[sid] = {
                        batchId: batch._id,
                        batchName: batch.name
                    };
                }
            }
        }

        // 5. Build a set of student IDs that already have fee records
        const studentsWithFees = new Set(fees.map(f => f.student?._id?.toString()).filter(Boolean));

        // 6. Map existing fee records
        const results = fees.map(fee => mapFeeToResult(fee));

        // 7. Add students without fee records
        const studentIdsWithoutFees = Object.keys(studentBatchMap).filter(sid => !studentsWithFees.has(sid));

        if (studentIdsWithoutFees.length > 0) {
            const students = await User.find({
                _id: { $in: studentIdsWithoutFees },
                role: 'student',
                deletedAt: null
            }).select('profile.firstName profile.lastName enrollmentNumber');

            for (const student of students) {
                const sid = student._id.toString();
                const info = studentBatchMap[sid];
                results.push({
                    _id: null,
                    student: {
                        _id: student._id,
                        profile: student.profile,
                        enrollmentNumber: student.enrollmentNumber
                    },
                    batch: {
                        _id: info.batchId,
                        name: info.batchName
                    },
                    totalAmount: 0,
                    paidAmount: 0,
                    balanceAmount: 0,
                    percentagePaid: 0,
                    hasFeeRecord: false,
                    installments: [],
                    status: 'not_started'
                });
            }
        }

        // 8. Apply percentage filter
        return applyPercentageFilter(results, filters.percentage);
    }

    static async recordPayment(feeId, installmentId, paymentDetails, actorId) {
        await connectDB();
        const fee = await FeeDb.findById(feeId).populate('student');
        if (!fee) throw new Error("Fee record not found");

        let savedAmount = 0;
        let details = {};

        // 1. Direct Installment Payment
        if (installmentId) {
            const installment = fee.installments.id(installmentId);
            if (!installment) throw new Error("Installment not found");
            if (installment.status === 'paid') throw new Error("Installment is already paid");

            installment.status = 'paid';
            installment.paidDate = paymentDetails.date ? new Date(paymentDetails.date) : new Date();
            installment.paymentMethod = paymentDetails.method;
            installment.transactionId = paymentDetails.transactionId;
            installment.collectedBy = paymentDetails.collectedBy;
            installment.notes = paymentDetails.notes;

            savedAmount = installment.amount;
            details = {
                name: getStudentName(fee.student),
                installmentId,
                amount: savedAmount
            };
        }
        // 2. Ad-hoc Payment (Waterfall or New)
        else {
            const amountToPay = parseFloat(paymentDetails.amount);
            if (isNaN(amountToPay) || amountToPay <= 0) throw new Error("Invalid payment amount");

            savedAmount = amountToPay;

            // Simple logic for now: 
            // If No Installments -> Create Paid Installment + Recurring Pending if needed?
            // BUT Fee model enforces installSum == total.
            // Best approach: "Pay" implies fulfilling an obligation.

            // If we have 0 installments (Initial state):
            if (!fee.installments || fee.installments.length === 0) {
                // Create one PAID installment for this amount
                fee.installments.push({
                    amount: amountToPay,
                    dueDate: paymentDetails.date ? new Date(paymentDetails.date) : new Date(),
                    status: 'paid',
                    paidDate: paymentDetails.date ? new Date(paymentDetails.date) : new Date(),
                    paymentMethod: paymentDetails.method,
                    transactionId: paymentDetails.transactionId,
                    collectedBy: paymentDetails.collectedBy,
                    notes: paymentDetails.notes
                });

                // And if there is remaining balance, create a pending installment for it?
                // Fee validation requires sum to match Total.
                // So yes, we MUST create the balance installment.
                const balance = fee.totalAmount - (fee.discount?.amount || 0) - amountToPay;
                if (balance > 0.1) {
                    fee.installments.push({
                        amount: balance,
                        dueDate: parseValidDate(paymentDetails.nextDueDate) || new Date(new Date().setMonth(new Date().getMonth() + 1)), // Use provided nextDueDate or Default 1 month later
                        status: 'pending'
                    });
                }
                details = {
                    name: getStudentName(fee.student),
                    type: 'ad-hoc',
                    amount: amountToPay,
                    balanceCreated: balance
                };
            }
            // If we HAVE installments -> Waterfall
            else {
                let remaining = amountToPay;
                const pendingInstallments = fee.installments.filter(i => i.status !== 'paid');

                if (pendingInstallments.length === 0) throw new Error("No pending installments to pay");

                // We only support clearing EXACT installments or splitting the FIRST one for now to avoid complexity?
                // Actually, let's just create a new 'paid' installment and reduce the pending one?
                // No, that changes the number of installments.

                // Let's go with: Apply to first pending.
                const current = pendingInstallments[0];

                if (Math.abs(current.amount - remaining) < 1.0) {
                    // Exact match
                    current.status = 'paid';
                    current.paidDate = paymentDetails.date ? new Date(paymentDetails.date) : new Date();
                    current.paymentMethod = paymentDetails.method;
                    current.transactionId = paymentDetails.transactionId;
                    current.collectedBy = paymentDetails.collectedBy;
                    current.notes = paymentDetails.notes;
                    remaining = 0;
                } else if (remaining < current.amount) {
                    // Partial payment of installment
                    // Split current into Paid (remaining) + Pending (current - remaining)
                    const originalAmount = current.amount;
                    const paidPart = remaining;
                    const balancePart = originalAmount - remaining;

                    // Update current to be the Balance (Pending)
                    // Update current to be the Balance (Pending)
                    current.amount = balancePart;
                    const nextDate = parseValidDate(paymentDetails.nextDueDate);
                    if (nextDate) {
                        current.dueDate = nextDate;
                    }

                    // Insert new Paid installment BEFORE current
                    // Mongoose array manipulation
                    const idx = fee.installments.indexOf(current);
                    fee.installments.splice(idx, 0, {
                        amount: paidPart,
                        dueDate: current.dueDate,
                        status: 'paid',
                        paidDate: paymentDetails.date ? new Date(paymentDetails.date) : new Date(),
                        paymentMethod: paymentDetails.method,
                        transactionId: paymentDetails.transactionId,
                        collectedBy: paymentDetails.collectedBy,
                        notes: paymentDetails.notes
                    });
                    remaining = 0;
                } else {
                    // Overpayment of single installment (Waterfall to next)
                    // For safety, let's BLOCK overpayment for now or just handle single installment.
                    // The UI sends "Remaining Balance" by default.

                    // If user tries to pay 4000 but installment is 2000.
                    // We pay 2000. Remaining 2000 goes to next.
                    // Implementation of full waterfall is complex and risky for now.
                    // Let's throw if amount > 1st pending installment + epsilon
                    throw new Error(`Payment amount (${amountToPay}) exceeds current pending installment (${current.amount}). Please pay installments sequentially.`);
                }
                details = {
                    name: getStudentName(fee.student),
                    type: 'waterfall',
                    amount: amountToPay
                };
            }
        }

        // Save triggers the pre-save hook to recalculate totals/status
        await fee.save();

        await createAuditLog({
            actor: actorId,
            action: 'fee.payment',
            resource: { type: 'Fee', id: fee._id },
            institute: fee.institute,
            details
        });

        return fee;
    }
    static async updateDiscount(feeId, discountData, actorId) {
        await connectDB();
        const fee = await FeeDb.findById(feeId).populate('student').populate('batch');
        if (!fee) throw new Error("Fee record not found");

        const oldDiscount = fee.discount?.amount || 0;
        const amountValue = typeof discountData === 'object' ? discountData.amount : discountData;
        const newDiscount = parseFloat(amountValue) || 0;

        if (newDiscount < 0) {
            throw new Error("Discount amount cannot be negative.");
        }
        if (newDiscount > fee.totalAmount) {
            throw new Error("Discount cannot exceed the total fee amount.");
        }

        const discountDiff = newDiscount - oldDiscount;
        fee.discount = {
            amount: newDiscount,
            reason: typeof discountData === 'object' ? discountData.reason : (fee.discount?.reason || 'General Discount'),
            appliedBy: actorId,
            appliedAt: new Date()
        };

        // If we have installments, we MUST adjust them to match the new total
        if (fee.installments && fee.installments.length > 0) {
            const pendingInstallments = fee.installments.filter(i => i.status !== 'paid');

            if (pendingInstallments.length > 0) {
                // Cascade discount difference across all pending installments (last-first)
                let remaining = discountDiff;
                for (let i = pendingInstallments.length - 1; i >= 0 && remaining > 0; i--) {
                    const inst = pendingInstallments[i];
                    const deduction = Math.min(inst.amount, remaining);
                    inst.amount = inst.amount - deduction;
                    remaining -= deduction;
                }

                if (remaining > 0.01) {
                    throw new Error("Discount exceeds remaining pending installments total.");
                }

                // Remove any installments that were reduced to zero
                for (const inst of pendingInstallments) {
                    if (inst.amount < 0.01) {
                        fee.installments.pull(inst._id);
                    }
                }
            } else if (discountDiff !== 0) {
                throw new Error("Cannot change discount on a fully paid fee record.");
            }
        }

        await fee.save();

        return fee;
    }

    static async cancelFee(feeId, actorId) {
        await connectDB();
        const fee = await FeeDb.findById(feeId).populate('student');
        if (!fee) throw new Error("Fee record not found");

        if (fee.status === 'cancelled') {
            throw new Error("Fee record is already cancelled");
        }

        const previousTotal = fee.totalAmount;
        const paid = fee.paidAmount || 0;

        // Pro-rate totalAmount to match what was actually paid
        fee.totalAmount = paid;
        fee.balanceAmount = 0;

        // Waive all non-paid installments
        if (fee.installments && fee.installments.length > 0) {
            for (const inst of fee.installments) {
                if (inst.status !== 'paid') {
                    inst.status = 'waived';
                    inst.amount = 0;
                }
            }
        }

        fee.status = 'cancelled';

        await fee.save();

        await createAuditLog({
            actor: actorId,
            action: 'fee.cancel',
            resource: { type: 'Fee', id: fee._id },
            institute: fee.institute,
            details: {
                student: fee.student?._id,
                previousTotal,
                paidAmount: paid,
                reason: 'Student discontinued / dropout'
            }
        });

        return fee;
    }
}
