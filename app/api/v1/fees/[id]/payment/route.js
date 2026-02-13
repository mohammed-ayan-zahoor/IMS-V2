import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";

const { z } = require("zod");

const PaymentSchema = z.object({
    installmentId: z.string().optional(), // Optional for ad-hoc / waterfall payments
    amount: z.number().positive("Amount must be positive"),
    method: z.string().min(1, "Payment method is required"),
    transactionId: z.string().optional(),
    date: z.string().optional(),
    collectedBy: z.string().optional(), // Whitelist collectedBy
    notes: z.string().optional(),
    nextDueDate: z.string().optional() // New field for remaining balance
});

export async function POST(req, { params }) {
    let fee = null;
    let processError = null;
    let paymentData = {};
    let targetInstallmentId = null;
    const session = await getServerSession(authOptions);

    try {
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params; // Fee ID
        const body = await req.json();

        // 1. Input Validation
        const validationResult = PaymentSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: validationResult.error.errors[0].message }, { status: 400 });
        }

        const { installmentId, ...paymentDetails } = validationResult.data;
        targetInstallmentId = installmentId; // For logging
        paymentData = paymentDetails;        // For logging

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

        // 2. Process Payment
        try {
            fee = await FeeService.recordPayment(id, installmentId, paymentDetails, session.user.id);
        } catch (err) {
            processError = err;
        }

        // 3. Audit Log (Always)
        try {
            await AuditLog.create({
                actor: session.user.id,
                action: 'fee.payment',
                resource: { type: 'Fee', id: id }, // Use ID from params as fee might be null
                details: {
                    student: feeRecord.student,
                    amount: paymentDetails.amount,
                    method: paymentDetails.method,
                    installmentId: installmentId,
                    status: fee ? 'success' : 'failed',
                    errorMessage: processError ? processError.message : (!fee ? 'Unknown failure' : undefined)
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (auditErr) {
            console.error("Audit Logging Failed:", auditErr);
        }

        // 4. Response
        if (processError) {
            console.error("Payment Processing Error:", processError); // Server-side log
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        if (!fee) {
            return NextResponse.json({ error: "Payment processing failed" }, { status: 400 });
        }

        return NextResponse.json(fee);

    } catch (error) {
        console.error("Unexpected Error in Payment Route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
