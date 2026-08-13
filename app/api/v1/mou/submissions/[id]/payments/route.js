import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

// POST /api/v1/mou/submissions/[id]/payments (Record new client payment)
export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { amount, paymentMethod, referenceId, paidDate, notes } = body;

        // Validation
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Please enter a valid positive payment amount" }, { status: 400 });
        }
        if (!paymentMethod || !['cash', 'card', 'upi', 'bank_transfer', 'cheque'].includes(paymentMethod)) {
            return NextResponse.json({ error: "Please select a valid payment method" }, { status: 400 });
        }

        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // Add payment to array
        submission.payments.push({
            amount: Number(amount),
            paymentMethod,
            referenceId: referenceId || "",
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            notes: notes || ""
        });

        // Automatically set status to converted since they processed payment
        submission.status = "converted";

        await submission.save();

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("Failed to record client payment:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}

// DELETE /api/v1/mou/submissions/[id]/payments?paymentId=xyz (Revoke/delete specific payment)
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const paymentId = searchParams.get('paymentId');

        if (!paymentId) {
            return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
        }

        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // Filter out payment by ID
        const initialCount = submission.payments.length;
        submission.payments = submission.payments.filter(
            p => p._id.toString() !== paymentId
        );

        if (submission.payments.length === initialCount) {
            return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
        }

        await submission.save();

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("Failed to delete payment:", error);
        return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
    }
}
