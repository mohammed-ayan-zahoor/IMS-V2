import { NextResponse } from "next/server";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelAllotment from "@/models/HostelAllotment";
import { createAuditLog } from "@/services/auditService";

export async function POST(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        const hasRoleAccess = ['admin', 'super_admin'].includes(scope?.user?.role) || 
            (scope?.user?.role === 'instructor' && scope?.user?.permissions?.includes('manage_hostel_payments'));
        if (!scope?.instituteId || !hasRoleAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { installmentId, amount, method, transactionId, collectedBy, notes, date } = body;

        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
        }

        await connectDB();

        const allotment = await HostelAllotment.findOne({ _id: id, deletedAt: null });
        if (!allotment) {
            return NextResponse.json({ error: "Allotment not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(allotment, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (amountNum > allotment.balanceAmount) {
            return NextResponse.json({ error: "Payment amount exceeds pending balance" }, { status: 400 });
        }

        const paymentDate = date ? new Date(date) : new Date();

        if (installmentId && installmentId !== 'adhoc') {
            // Pay specific installment
            const inst = allotment.installments.id(installmentId);
            if (!inst) {
                return NextResponse.json({ error: "Installment not found" }, { status: 404 });
            }

            inst.status = 'paid';
            inst.paidDate = paymentDate;
            inst.paymentMethod = method || 'cash';
            inst.transactionId = transactionId || undefined;
            inst.collectedBy = collectedBy || undefined;
            inst.notes = notes || undefined;
        } else {
            // Waterfall payment: distribute across pending/overdue installments sequentially
            let remaining = amountNum;
            for (const inst of allotment.installments) {
                if (remaining <= 0) break;
                if (inst.status === 'pending' || inst.status === 'overdue') {
                    inst.status = 'paid';
                    inst.paidDate = paymentDate;
                    inst.paymentMethod = method || 'cash';
                    inst.transactionId = transactionId || undefined;
                    inst.collectedBy = collectedBy || undefined;
                    inst.notes = notes || undefined;
                    remaining -= inst.amount;
                }
            }
        }

        // Save allotment - pre-save hook will recalculate paidAmount, balanceAmount, totalAmount, feeStatus
        const updatedAllotment = await allotment.save();

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.allotment.payment',
                resource: { type: 'HostelAllotment', id: allotment._id },
                institute: scope.instituteId,
                details: {
                    student: allotment.student,
                    amount: amountNum,
                    method,
                    installmentId
                }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ allotment: updatedAllotment });
    } catch (error) {
        console.error("POST /api/v1/hostel/allotments/[id]/payment error:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}
