import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import User from "@/models/User";
import { getBeamsInstance } from "@/lib/pusher";

const CRON_SECRET = process.env.CRON_SECRET || "ims_cron_secret_2026";

export async function GET(req) {
    return handleFeeDuesCron(req);
}

export async function POST(req) {
    return handleFeeDuesCron(req);
}

async function handleFeeDuesCron(req) {
    try {
        const { searchParams } = new URL(req.url);
        const secretParam = searchParams.get("secret");
        const secretHeader = req.headers.get("x-cron-secret");

        // Security check
        if (secretParam !== CRON_SECRET && secretHeader !== CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized: Invalid cron secret" }, { status: 401 });
        }

        await connectDB();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const inThreeDays = new Date(today);
        inThreeDays.setDate(inThreeDays.getDate() + 3);
        inThreeDays.setHours(23, 59, 59, 999);

        // Query active fees with unpaid balance (use lean for speed)
        const activeFees = await Fee.find({
            status: { $in: ["not_started", "partial", "overdue"] },
            balanceAmount: { $gt: 0 }
        })
            .populate("student", "profile.firstName profile.lastName email role institute")
            .populate("institute", "name")
            .lean();

        if (!activeFees || activeFees.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No pending or overdue fee dues found",
                count: 0,
                dues: []
            });
        }

        const beamsCache = {};
        const getBeams = async (instId) => {
            const key = instId || "default";
            if (!(key in beamsCache)) {
                beamsCache[key] = await getBeamsInstance(instId === "default" ? null : instId);
            }
            return beamsCache[key];
        };

        const sentResults = [];

        for (const feeDoc of activeFees) {
            const student = feeDoc.student;
            if (!student || !student._id) continue;

            const studentId = student._id.toString();
            const firstName = student.profile?.firstName || "Student";
            const instName = feeDoc.institute?.name || "the Institute";
            const balance = feeDoc.balanceAmount;

            // Find matching installment (due within 3 days, today, or overdue)
            let matchingInstallment = null;
            let isOverdue = false;

            for (const inst of feeDoc.installments || []) {
                if (inst.status === "paid" || inst.status === "waived") continue;
                const dueDate = new Date(inst.dueDate);
                
                if (dueDate < today) {
                    matchingInstallment = inst;
                    isOverdue = true;
                    break;
                } else if (dueDate <= inThreeDays) {
                    matchingInstallment = inst;
                    break;
                }
            }

            // Only notify if installment is due within 3 days, today, or overdue
            if (!matchingInstallment && feeDoc.status !== "overdue") continue;

            const installmentAmount = matchingInstallment ? matchingInstallment.amount : balance;
            const dueDateFormatted = matchingInstallment 
                ? new Date(matchingInstallment.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "soon";

            let title = "💳 Fee Payment Reminder";
            let body = `Hi ${firstName}, you have a pending fee balance of ₹${balance.toLocaleString("en-IN")} at ${instName}. Due: ${dueDateFormatted}.`;

            if (isOverdue) {
                title = "⚠️ Overdue Fee Alert";
                body = `Hi ${firstName}, your fee installment of ₹${installmentAmount.toLocaleString("en-IN")} at ${instName} was due on ${dueDateFormatted} and is now overdue. Please pay at your earliest.`;
            }

            const instituteIdParam = feeDoc.institute?._id?.toString() || null;
            const beamsClient = await getBeams(instituteIdParam);

            if (!beamsClient) continue;

            const payload = {
                apns: {
                    aps: {
                        alert: { title, body },
                        sound: "default"
                    }
                },
                fcm: {
                    data: {
                        title,
                        body,
                        type: "fee_due",
                        feeId: feeDoc._id.toString(),
                        studentId
                    },
                    priority: "high"
                },
                web: {
                    notification: {
                        title,
                        body,
                        deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/fees`
                    }
                }
            };

            try {
                const res = await beamsClient.publishToUsers([studentId], payload);
                sentResults.push({
                    studentId,
                    name: `${firstName} ${student.profile?.lastName || ""}`.trim(),
                    balance,
                    isOverdue,
                    publishId: res.publishId
                });
            } catch (beamsErr) {
                console.error(`[Fee Dues Cron] Failed sending push to student ${studentId}:`, beamsErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed fee dues. Sent ${sentResults.length} reminder notification(s).`,
            count: sentResults.length,
            remindersSent: sentResults
        });

    } catch (error) {
        console.error("Fee Dues Cron Error:", error);
        return NextResponse.json({ error: "Failed to execute fee dues cron job", details: error.message }, { status: 500 });
    }
}
