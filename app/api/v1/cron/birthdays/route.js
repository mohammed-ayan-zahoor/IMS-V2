import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getBeamsInstance } from "@/lib/pusher";

const CRON_SECRET = process.env.CRON_SECRET || "ims_cron_secret_2026";
const BEAMS_BATCH_LIMIT = 1000; // Pusher Beams supports up to 1,000 user IDs per single publish call

export async function GET(req) {
    return handleBirthdayCron(req);
}

export async function POST(req) {
    return handleBirthdayCron(req);
}

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

async function handleBirthdayCron(req) {
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
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        // Find all active students whose profile.dateOfBirth matches today's month and day (lean query)
        const birthdayStudents = await User.find({
            role: "student",
            "profile.dateOfBirth": { $exists: true, $ne: null },
            $expr: {
                $and: [
                    { $eq: [{ $month: "$profile.dateOfBirth" }, currentMonth] },
                    { $eq: [{ $dayOfMonth: "$profile.dateOfBirth" }, currentDay] }
                ]
            }
        })
            .select("_id profile.firstName profile.lastName institute")
            .populate("institute", "name")
            .lean();

        if (!birthdayStudents || birthdayStudents.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No student birthdays found today",
                count: 0
            });
        }

        // Group students by institute ID
        const groupedByInstitute = {};
        for (const student of birthdayStudents) {
            const instId = student.institute?._id?.toString() || "default";
            if (!groupedByInstitute[instId]) {
                groupedByInstitute[instId] = {
                    instituteId: instId === "default" ? null : instId,
                    instituteName: student.institute?.name || "the Institute",
                    studentIds: []
                };
            }
            groupedByInstitute[instId].studentIds.push(student._id.toString());
        }

        let totalPushedCount = 0;
        const publishLogs = [];

        for (const [instId, group] of Object.entries(groupedByInstitute)) {
            const { instituteId, instituteName, studentIds } = group;
            if (studentIds.length === 0) continue;

            const beamsClient = await getBeamsInstance(instituteId);
            if (!beamsClient) continue;

            const title = "🎂 Happy Birthday!";
            const body = `Happy Birthday! Wishing you a wonderful day and a successful year ahead from all of us at ${instituteName}! 🎉`;

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
                        type: "birthday"
                    },
                    priority: "high"
                },
                web: {
                    notification: {
                        title,
                        body,
                        deep_link: process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"
                    }
                }
            };

            // Split student IDs into batches of 1,000 users per request
            const idChunks = chunkArray(studentIds, BEAMS_BATCH_LIMIT);

            for (const chunk of idChunks) {
                try {
                    console.log(`[Birthday Cron Bulk] Publishing birthday wishes to ${chunk.length} students at ${instituteName}`);
                    const res = await beamsClient.publishToUsers(chunk, payload);
                    totalPushedCount += chunk.length;
                    publishLogs.push({
                        instituteName,
                        targetCount: chunk.length,
                        publishId: res.publishId
                    });
                } catch (beamsErr) {
                    console.error(`[Birthday Cron Bulk] Failed publishing batch of ${chunk.length} students:`, beamsErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent birthday wishes to ${totalPushedCount} student(s) across ${Object.keys(groupedByInstitute).length} institute(s).`,
            totalStudentsNotified: totalPushedCount,
            batches: publishLogs
        });

    } catch (error) {
        console.error("Birthday Cron Error:", error);
        return NextResponse.json({ error: "Failed to execute birthday cron job", details: error.message }, { status: 500 });
    }
}
