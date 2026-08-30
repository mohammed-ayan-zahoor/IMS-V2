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

        // Fire-and-forget push notification for transport fee payment receipt
        (async () => {
            try {
                const { getBeamsInstance } = await import("@/lib/pusher");
                const beamsClient = await getBeamsInstance(fee.institute);
                if (beamsClient && fee.student) {
                    const studentId = fee.student.toString();
                    const collectedAmount = validation.data.amount;
                    const remainingBalance = updatedFee?.balanceAmount ?? 0;
                    const payMethod = (validation.data.method || "payment").toUpperCase();
                    
                    const title = `🚌 Transport Fee Payment Received: ₹${collectedAmount}`;
                    const body = `Transport fee payment of ₹${collectedAmount} received via ${payMethod}. Remaining balance: ₹${remainingBalance}.`;

                    const payload = {
                        apns: {
                            aps: {
                                alert: { title, body },
                                sound: "default"
                            }
                        },
                        fcm: {
                            notification: {
                                title,
                                body,
                                channel_id: "high_importance_channel",
                                sound: "default"
                            },
                            data: {
                                title,
                                body,
                                type: "fee_payment",
                                feeId: fee._id.toString(),
                                amount: collectedAmount.toString(),
                                balanceAmount: remainingBalance.toString(),
                                instituteId: fee.institute.toString()
                            },
                            priority: "high"
                        },
                        web: {
                            notification: {
                                title,
                                body,
                                deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/transport`
                            }
                        }
                    };

                    await beamsClient.publishToUsers([studentId], payload);
                    console.log(`[Transport Fee Push] Sent payment push notification to student ${studentId} for ₹${collectedAmount}`);
                }
            } catch (pushErr) {
                console.error("[Transport Fee Push] Error dispatching push notification:", pushErr);
            }
        })().catch(() => {});

        return NextResponse.json(updatedFee);
    } catch (error) {
        console.error("[TRANSPORT_PAYMENT_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
