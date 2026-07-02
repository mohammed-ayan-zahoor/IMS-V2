import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";

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
        const slots = parseInt(body.slots);
        if (!slots || slots < 1) {
            return NextResponse.json({ error: "Invalid slot quantity" }, { status: 400 });
        }

        const scope = await getInstituteScope(req);
        const targetInstituteId = scope?.instituteId;

        if (!targetInstituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: "Razorpay credentials are not configured on the server" }, { status: 500 });
        }

        const amountInRupees = 590 * slots;
        const amountInPaise = amountInRupees * 100;

        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: "INR",
                receipt: `receipt_slots_${targetInstituteId}_${Date.now()}`
            })
        });

        if (!rzpResponse.ok) {
            const errBody = await rzpResponse.json().catch(() => ({}));
            return NextResponse.json({ error: errBody.error?.description || "Failed to create Razorpay order" }, { status: 400 });
        }

        const rzpOrder = await rzpResponse.json();

        await connectDB();
        const PlatformTransaction = (await import("@/models/PlatformTransaction")).default;
        await PlatformTransaction.create({
            institute: targetInstituteId,
            razorpayOrderId: rzpOrder.id,
            status: 'pending',
            amount: amountInRupees,
            slots: slots,
            studentsAdded: slots * 10
        });

        return NextResponse.json({
            orderId: rzpOrder.id,
            amount: amountInPaise,
            keyId: keyId,
            currency: "INR"
        });

    } catch (error) {
        console.error("Billing Create Order Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
