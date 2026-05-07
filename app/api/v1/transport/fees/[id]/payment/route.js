import { NextResponse } from "next/server";
import { TransportService } from "@/services/transportService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import TransportFee from "@/models/TransportFee";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import { z } from "zod";

const PaymentSchema = z.object({
    installmentId: z.string().optional(),
    amount: z.number().positive("Amount must be positive"),
    method: z.string().min(1, "Payment method is required"),
    transactionId: z.string().optional(),
    date: z.string().optional(),
    collectedBy: z.string().optional(),
    notes: z.string().optional()
});

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const validation = PaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        const fee = await TransportFee.findById(id);
        if (!fee) {
            return NextResponse.json({ error: "Transport fee record not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(fee, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const updatedFee = await TransportService.recordPayment(id, validation.data, session.user.id);

        return NextResponse.json(updatedFee);
    } catch (error) {
        console.error("[TRANSPORT_PAYMENT_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
