import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params; // Fee ID
        const body = await req.json();
        const { installmentId, ...paymentDetails } = body;

        await connectDB();
        const scope = await getInstituteScope(req);

        // Fetch fee to verify institute ownership
        const feeRecord = await Fee.findById(id);
        if (!feeRecord) {
            return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(feeRecord, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied: This fee record belongs to another institute" }, { status: 403 });
        }

        const fee = await FeeService.recordPayment(id, installmentId, paymentDetails, session.user.id);

        // Audit Log
        if (fee) {
            await AuditLog.create({
                actor: session.user.id,
                action: 'fee.payment',
                resource: { type: 'Fee', id: fee._id },
                details: {
                    student: fee.student,
                    amount: paymentDetails.amount,
                    method: paymentDetails.method,
                    installmentId: installmentId
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        }

        return NextResponse.json(fee);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
