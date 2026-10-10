import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import crypto from "crypto";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Session from "@/models/Session";
import StudentAccessTransaction from "@/models/StudentAccessTransaction";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
        }

        const body = await req.json();
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: "Missing required payment verification parameters" }, { status: 400 });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return NextResponse.json({ error: "Server payment configuration error" }, { status: 500 });
        }

        // 1. Verify Razorpay HMAC SHA256 Signature
        const hmac = crypto.createHmac("sha256", keySecret);
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpaySignature) {
            console.error("Payment signature mismatch:", { generatedSignature, razorpaySignature });
            return NextResponse.json({ error: "Invalid payment signature verification failed" }, { status: 400 });
        }

        await connectDB();

        // 2. Fetch existing transaction record
        const tx = await StudentAccessTransaction.findOne({ razorpayOrderId });
        if (!tx) {
            return NextResponse.json({ error: "Transaction record not found for this order" }, { status: 404 });
        }

        // Check if student matches the authenticated user (or super_admin override)
        if (tx.student.toString() !== session.user.id && session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Payment does not belong to the current user" }, { status: 403 });
        }

        // 3. Idempotency Check: If already captured, return immediate success
        if (tx.status === "captured") {
            return NextResponse.json({
                success: true,
                message: "Subscription is already active",
                expiresAt: tx.validUntil?.toISOString(),
                invoiceNumber: tx.invoiceNumber
            });
        }

        // 4. Resolve the institute cycle expiration date
        const institute = await Institute.findById(tx.institute).select('subscription settings');
        let targetExpiryDate = institute?.subscription?.endDate;

        if (!targetExpiryDate) {
            const activeSession = await Session.findOne({ instituteId: tx.institute, isActive: true });
            targetExpiryDate = activeSession?.endDate;
        }

        // If neither exists, fallback to transaction's pre-computed validUntil
        if (!targetExpiryDate) {
            targetExpiryDate = tx.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }

        const invoiceNumber = `INV-STD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        // 5. Update transaction status
        tx.status = "captured";
        tx.razorpayPaymentId = razorpayPaymentId;
        tx.razorpaySignature = razorpaySignature;
        tx.validFrom = new Date();
        tx.validUntil = targetExpiryDate;
        tx.invoiceNumber = invoiceNumber;
        await tx.save();

        // 6. Update student accessSubscription
        await User.findByIdAndUpdate(tx.student, {
            $set: {
                'accessSubscription.status': 'ACTIVE',
                'accessSubscription.paidAt': new Date(),
                'accessSubscription.expiresAt': targetExpiryDate,
                'accessSubscription.instituteCycleDate': targetExpiryDate,
                'accessSubscription.academicSession': tx.academicSession,
                'accessSubscription.amountPaid': tx.totalAmount,
                'accessSubscription.razorpayOrderId': razorpayOrderId,
                'accessSubscription.razorpayPaymentId': razorpayPaymentId
            }
        });

        return NextResponse.json({
            success: true,
            message: "Student access subscription activated successfully",
            expiresAt: targetExpiryDate.toISOString(),
            invoiceNumber: invoiceNumber
        });

    } catch (error) {
        console.error("POST /api/v1/student/subscription/verify-payment error:", error);
        return NextResponse.json({ error: "Internal server error occurred while verifying payment" }, { status: 500 });
    }
}
