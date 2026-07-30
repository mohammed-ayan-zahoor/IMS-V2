import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { getBeamsInstance } from "@/lib/pusher";

const CRON_SECRET = process.env.CRON_SECRET || "ims_cron_secret_2026";

export async function GET(req) {
    return handleBirthdayCron(req);
}

export async function POST(req) {
    return handleBirthdayCron(req);
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
        const currentMonth = today.getMonth() + 1; // 1-indexed (1-12)
        const currentDay = today.getDate();        // 1-indexed (1-31)

        // Find all active students whose profile.dateOfBirth matches today's month and day
        const birthdayStudents = await User.find({
            role: "student",
            "profile.dateOfBirth": { $exists: true, $ne: null },
            $expr: {
                $and: [
                    { $eq: [{ $month: "$profile.dateOfBirth" }, currentMonth] },
                    { $eq: [{ $dayOfMonth: "$profile.dateOfBirth" }, currentDay] }
                ]
            }
        }).populate("institute", "name");

        if (birthdayStudents.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No student birthdays found today",
                count: 0,
                students: []
            });
        }

        // Group students by institute ID to resolve dynamic Beams instances
        const groupedByInstitute = {};
        for (const student of birthdayStudents) {
            const instId = student.institute?._id?.toString() || "default";
            if (!groupedByInstitute[instId]) {
                groupedByInstitute[instId] = {
                    instituteName: student.institute?.name || "the Institute",
                    students: []
                };
            }
            groupedByInstitute[instId].students.push(student);
        }

        const sentResults = [];

        for (const [instId, group] of Object.entries(groupedByInstitute)) {
            const instituteIdParam = instId === "default" ? null : instId;
            const beamsClient = await getBeamsInstance(instituteIdParam);

            if (!beamsClient) {
                console.warn(`[Birthday Cron] Could not resolve Beams client for institute ${instId}`);
                continue;
            }

            for (const student of group.students) {
                const studentId = student._id.toString();
                const firstName = student.profile?.firstName || "Student";
                const instName = group.instituteName;

                const title = "🎂 Happy Birthday!";
                const body = `Happy Birthday ${firstName}! Wishing you a wonderful day and a successful year ahead from all of us at ${instName}! 🎉`;

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
                            type: "birthday",
                            studentId
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

                try {
                    console.log(`[Birthday Cron] Publishing push notification to student ${studentId} (${firstName})`);
                    const res = await beamsClient.publishToUsers([studentId], payload);
                    sentResults.push({
                        studentId,
                        name: `${firstName} ${student.profile?.lastName || ''}`.trim(),
                        publishId: res.publishId
                    });
                } catch (beamsErr) {
                    console.error(`[Birthday Cron] Failed sending notification to ${studentId}:`, beamsErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent ${sentResults.length} birthday notification(s)`,
            count: sentResults.length,
            sentTo: sentResults
        });

    } catch (error) {
        console.error("Birthday Cron Error:", error);
        return NextResponse.json({ error: "Failed to execute birthday cron job", details: error.message }, { status: 500 });
    }
}
