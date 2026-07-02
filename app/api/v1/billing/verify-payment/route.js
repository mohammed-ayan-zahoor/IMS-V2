import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import crypto from "crypto";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: "Missing required verification fields" }, { status: 400 });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return NextResponse.json({ error: "Razorpay credentials are not configured on the server" }, { status: 500 });
        }

        // Cryptographic Signature Verification
        const hmac = crypto.createHmac("sha256", keySecret);
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpaySignature) {
            return NextResponse.json({ error: "Signature verification failed: Invalid transaction source" }, { status: 400 });
        }

        await connectDB();
        const PlatformTransaction = (await import("@/models/PlatformTransaction")).default;
        const tx = await PlatformTransaction.findOne({ razorpayOrderId });

        if (!tx) {
            return NextResponse.json({ error: "Order details not found" }, { status: 404 });
        }

        if (tx.status === 'captured') {
            return NextResponse.json({ success: true, message: "Payment already captured" });
        }

        // Update transaction info
        tx.razorpayPaymentId = razorpayPaymentId;
        tx.razorpaySignature = razorpaySignature;
        tx.status = 'captured';
        await tx.save();

        // Increment student limits in the Institute document
        const Institute = (await import("@/models/Institute")).default;
        await Institute.findByIdAndUpdate(tx.institute, {
            $inc: { "limits.maxStudents": tx.studentsAdded }
        });

        // Clear dashboard stats cache for this institute
        try {
            const { clearDashboardCache } = await import("@/app/api/v1/dashboard/stats/route");
            clearDashboardCache(tx.institute.toString());
        } catch (cacheError) {
            console.error("Cache eviction error during payment verification:", cacheError);
        }

        // Create platform audit log entry
        const AuditLog = (await import("@/models/AuditLog")).default;
        await AuditLog.create({
            actor: session.user.id,
            action: 'billing.slots_purchase',
            resource: { type: 'Institute', id: tx.institute },
            institute: tx.institute,
            details: {
                slots: tx.slots,
                studentsAdded: tx.studentsAdded,
                amount: tx.amount,
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId
            }
        });

        return NextResponse.json({
            success: true,
            studentsAdded: tx.studentsAdded,
            message: `Successfully purchased ${tx.slots} slot(s). ${tx.studentsAdded} students have been added to your quota.`
        });

    } catch (error) {
        console.error("Billing Verify Payment Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
