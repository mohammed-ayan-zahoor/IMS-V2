import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import User from "@/models/User";
import { getBeamsInstance } from "@/lib/pusher";

const CRON_SECRET = process.env.CRON_SECRET || "ims_cron_secret_2026";
const BEAMS_BATCH_LIMIT = 1000; // Pusher Beams supports up to 1,000 unique user IDs per single publish call

export async function GET(req) {
    return handleFeeDuesCron(req);
}

export async function POST(req) {
    return handleFeeDuesCron(req);
}

// Helper to split array into chunks of 1,000
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
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

        // Fetch unpaid fees using lean query selecting ONLY required fields
        const activeFees = await Fee.find({
            status: { $in: ["not_started", "partial", "overdue"] },
            balanceAmount: { $gt: 0 }
        })
            .select("student institute balanceAmount installments status")
            .populate("student", "profile.firstName email role")
            .populate("institute", "name")
            .lean();

        if (!activeFees || activeFees.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No pending or overdue fee dues found",
                count: 0,
                processed: 0
            });
        }

        // Partition notifications by (instituteId + notificationCategory) using a Set for unique student IDs
        const groupedMap = {};

        for (const feeDoc of activeFees) {
            const student = feeDoc.student;
            if (!student || !student._id) continue;

            const studentId = student._id.toString();
            const instId = feeDoc.institute?._id?.toString() || "default";
            const instName = feeDoc.institute?.name || "the Institute";

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

            if (!matchingInstallment && feeDoc.status !== "overdue") continue;

            const category = isOverdue ? "overdue" : "upcoming";
            const groupKey = `${instId}::${category}`;

            if (!groupedMap[groupKey]) {
                groupedMap[groupKey] = {
                    instituteId: instId === "default" ? null : instId,
                    instituteName: instName,
                    category,
                    studentIdsSet: new Set()
                };
            }

            groupedMap[groupKey].studentIdsSet.add(studentId);
        }

        let totalPushedCount = 0;
        const publishLogs = [];

        // Publish using Pusher Beams bulk batching
        for (const [groupKey, group] of Object.entries(groupedMap)) {
            const { instituteId, instituteName, category, studentIdsSet } = group;
            const uniqueStudentIds = Array.from(studentIdsSet);
            if (uniqueStudentIds.length === 0) continue;

            const beamsClient = await getBeamsInstance(instituteId);
            if (!beamsClient) continue;

            let title, body;
            if (category === "overdue") {
                title = "⚠️ Overdue Fee Alert";
                body = `Overdue Fee Alert: You have an overdue fee balance at ${instituteName}. Please clear your dues at your earliest.`;
            } else {
                title = "💳 Fee Payment Reminder";
                body = `Fee Reminder: You have an upcoming fee balance payment due at ${instituteName}. Tap to view details.`;
            }

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
                        type: "fee_due"
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

            // Chunk unique student IDs into batches of 1,000
            const idChunks = chunkArray(uniqueStudentIds, BEAMS_BATCH_LIMIT);

            for (const chunk of idChunks) {
                try {
                    console.log(`[Fee Dues Bulk] Publishing ${category} fee reminder to ${chunk.length} unique students (Institute: ${instituteName})`);
                    const res = await beamsClient.publishToUsers(chunk, payload);
                    totalPushedCount += chunk.length;
                    publishLogs.push({
                        category,
                        instituteName,
                        targetCount: chunk.length,
                        publishId: res.publishId
                    });
                } catch (beamsErr) {
                    console.error(`[Fee Dues Bulk] Error publishing batch of ${chunk.length} students:`, beamsErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed fee dues. Bulk published notifications to ${totalPushedCount} unique student(s) across ${Object.keys(groupedMap).length} group(s).`,
            totalStudentsNotified: totalPushedCount,
            batches: publishLogs
        });

    } catch (error) {
        console.error("Fee Dues Cron Error:", error);
        return NextResponse.json({ error: "Failed to execute fee dues cron job", details: error.message }, { status: 500 });
    }
}
