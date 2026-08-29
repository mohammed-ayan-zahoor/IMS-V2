import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Fee from "@/models/Fee";
import { getBeamsInstance } from "@/lib/pusher";
import mongoose from "mongoose";

export async function GET(req) {
    return handleSendReminders(req);
}

export async function POST(req) {
    return handleSendReminders(req);
}

async function handleSendReminders(req) {
    try {
        // 1. Validate Cron Secret Token
        const { searchParams } = new URL(req.url);
        const secretParam = searchParams.get("secret");
        const secretHeader = req.headers.get("x-cron-secret");
        const authHeader = req.headers.get("authorization");
        const token = authHeader ? authHeader.replace("Bearer ", "") : null;
        const validSecrets = [
            process.env.CRON_SECRET || "ims_cron_secret_2026",
            process.env.CRON_SECRET_KEY || "super-secret-cron-key"
        ];
        
        const isAuthorized = validSecrets.includes(secretParam) || 
                             validSecrets.includes(secretHeader) || 
                             validSecrets.includes(token);

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const today = new Date();
        const month = today.getMonth() + 1; // 1-indexed
        const day = today.getDate();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        // 2. Birthday Notifications
        // Find students whose birthday is today
        const birthdayStudents = await User.find({
            role: 'student',
            deletedAt: null,
            'profile.dateOfBirth': { $exists: true },
            $expr: {
                $and: [
                    { $eq: [{ $month: '$profile.dateOfBirth' }, month] },
                    { $eq: [{ $dayOfMonth: '$profile.dateOfBirth' }, day] }
                ]
            }
        });

        // Group birthday students by institute
        const birthdayByInstitute = {};
        for (const student of birthdayStudents) {
            if (!student.institute) continue;
            const instId = student.institute.toString();
            if (!birthdayByInstitute[instId]) {
                birthdayByInstitute[instId] = [];
            }
            birthdayByInstitute[instId].push(student);
        }

        // Trigger birthday notifications
        let birthdayNotificationsCount = 0;
        for (const [instId, students] of Object.entries(birthdayByInstitute)) {
            try {
                const beamsClient = await getBeamsInstance(instId);
                if (beamsClient) {
                    const studentIds = students.map(s => s._id.toString());
                    const payload = {
                        apns: {
                            aps: {
                                alert: {
                                    title: "Happy Birthday! 🎂",
                                    body: "Wishing you a wonderful birthday from all of us!"
                                },
                                sound: "default"
                            }
                        },
                        fcm: {
                            notification: {
                                title: "Happy Birthday! 🎂",
                                body: "Wishing you a wonderful birthday from all of us!",
                                channel_id: "high_importance_channel",
                                sound: "default"
                            },
                            priority: "high"
                        }
                    };
                    await beamsClient.publishToUsers(studentIds, payload);
                    birthdayNotificationsCount += studentIds.length;
                    console.log(`[Cron] Sent birthday notification to ${studentIds.length} students at institute ${instId}`);
                }
            } catch (err) {
                console.error(`[Cron] Failed to send birthday notifications for institute ${instId}:`, err.message);
            }
        }

        // 3. Fee Reminders
        // Find all Fee documents with pending installments due today or overdue
        const feesWithPendingInstallments = await Fee.find({
            'installments': {
                $elemMatch: {
                    status: 'pending',
                    dueDate: { $lte: endOfToday }
                }
            }
        }).populate('student', 'email profile');

        // Group fee reminders by institute
        const feesByInstitute = {};
        for (const fee of feesWithPendingInstallments) {
            if (!fee.institute || !fee.student) continue;
            const instId = fee.institute.toString();
            if (!feesByInstitute[instId]) {
                feesByInstitute[instId] = [];
            }
            feesByInstitute[instId].push(fee);
        }

        // Trigger fee reminders
        let feeNotificationsCount = 0;
        for (const [instId, fees] of Object.entries(feesByInstitute)) {
            try {
                const beamsClient = await getBeamsInstance(instId);
                if (beamsClient) {
                    for (const fee of fees) {
                        const studentId = fee.student._id.toString();
                        // Find the earliest overdue/due pending installment
                        const pendingInstallment = (fee.installments || []).find(
                            inst => inst.status === 'pending' && inst.dueDate <= endOfToday
                        );
                        
                        if (!pendingInstallment) continue;

                        const amountFormatted = pendingInstallment.amount;
                        const bodyText = `A course fee installment of ₹${amountFormatted} is pending (Due Date: ${new Date(pendingInstallment.dueDate).toLocaleDateString()}). Please make your payment.`;

                        const payload = {
                            apns: {
                                aps: {
                                    alert: {
                                        title: "Fee Payment Reminder 💰",
                                        body: bodyText
                                    },
                                    sound: "default"
                                }
                            },
                            fcm: {
                                notification: {
                                    title: "Fee Payment Reminder 💰",
                                    body: bodyText,
                                    channel_id: "high_importance_channel",
                                    sound: "default"
                                },
                                priority: "high"
                            }
                        };
                        
                        await beamsClient.publishToUsers([studentId], payload);
                        feeNotificationsCount++;
                    }
                    console.log(`[Cron] Sent ${fees.length} fee reminders for institute ${instId}`);
                }
            } catch (err) {
                console.error(`[Cron] Failed to send fee reminders for institute ${instId}:`, err.message);
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                birthdayNotificationsSent: birthdayNotificationsCount,
                feeRemindersSent: feeNotificationsCount
            }
        });

    } catch (error) {
        console.error("[Cron] send-reminders execution error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
