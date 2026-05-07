import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportFee from "@/models/TransportFee";
import { createAuditLog } from "@/services/auditService";

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) return NextResponse.json({ error: "Institute context required" }, { status: 400 });

        await connectDB();
        const body = await req.json();

        if (!body.installmentId) {
            return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
        }
        if (!body.paymentMethod) {
            return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
        }

        const fee = await TransportFee.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!fee) return NextResponse.json({ error: "Transport fee not found" }, { status: 404 });

        const installment = fee.installments.id(body.installmentId);
        if (!installment) {
            return NextResponse.json({ error: "Installment not found" }, { status: 404 });
        }

        if (installment.status === 'paid') {
            return NextResponse.json({ error: "This installment is already paid" }, { status: 400 });
        }

        installment.status = 'paid';
        installment.paidDate = new Date();
        installment.paymentMethod = body.paymentMethod;
        installment.transactionId = body.transactionId || '';
        installment.collectedBy = body.collectedBy || session.user.name || '';
        installment.notes = body.notes || '';

        await fee.save(); // Triggers pre-save hook: updates paidAmount, balanceAmount, status

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.fee.payment',
            resource: { type: 'TransportFee', id: fee._id },
            institute: scope.instituteId,
            details: { 
                installmentLabel: installment.label, 
                amount: installment.amount,
                paymentMethod: body.paymentMethod,
                studentId: fee.student.toString()
            }
        });

        return NextResponse.json({ 
            success: true, 
            fee,
            message: `Payment of ₹${installment.amount} recorded for ${installment.label}`
        });
    } catch (error) {
        console.error("POST /api/v1/transport/fees/[id]/pay error:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}
