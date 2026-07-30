import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";
import Institute from "@/models/Institute";
import { getBeamsInstance } from "@/lib/pusher";
import { startOfDay, endOfDay, parseISO } from "date-fns";

const BEAMS_BATCH_LIMIT = 1000;

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Fire-and-forget helper function for sending instant attendance push notifications
async function sendAttendancePushNotifications(instituteId, batchId, records) {
    try {
        if (!instituteId || !Array.isArray(records) || records.length === 0) return;

        const instituteDoc = await Institute.findById(instituteId).select("name settings").lean();
        if (!instituteDoc) return;

        const instName = instituteDoc.name || "the Institute";
        const attSettings = instituteDoc.settings?.attendance?.pushNotifications || {
            onPresent: true,
            onAbsent: true,
            onLate: true
        };

        const batchDoc = await Batch.findById(batchId).select("name").lean();
        const batchName = batchDoc?.name ? ` for ${batchDoc.name}` : "";

        // Group unique student IDs by status
        const statusGroups = {
            present: new Set(),
            absent: new Set(),
            late: new Set()
        };

        for (const r of records) {
            if (!r.studentId || !r.status) continue;
            const s = r.status.toLowerCase();
            if (s in statusGroups) {
                statusGroups[s].add(r.studentId.toString());
            }
        }

        const beamsClient = await getBeamsInstance(instituteId);
        if (!beamsClient) return;

        const notificationsConfig = [
            {
                status: "present",
                enabled: attSettings.onPresent !== false,
                title: "✅ Attendance Marked",
                body: `Your attendance${batchName} at ${instName} was marked Present today.`
            },
            {
                status: "absent",
                enabled: attSettings.onAbsent !== false,
                title: "⚠️ Attendance Alert",
                body: `Notice: You were marked Absent${batchName} at ${instName} today.`
            },
            {
                status: "late",
                enabled: attSettings.onLate !== false,
                title: "⏰ Attendance Alert",
                body: `Notice: You were marked Late${batchName} at ${instName} today.`
            }
        ];

        for (const config of notificationsConfig) {
            if (!config.enabled) continue;
            const studentIds = Array.from(statusGroups[config.status]);
            if (studentIds.length === 0) continue;

            const payload = {
                apns: {
                    aps: {
                        alert: { title: config.title, body: config.body },
                        sound: "default"
                    }
                },
                fcm: {
                    data: {
                        title: config.title,
                        body: config.body,
                        type: "attendance"
                    },
                    priority: "high"
                },
                web: {
                    notification: {
                        title: config.title,
                        body: config.body,
                        deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/attendance`
                    }
                }
            };

            const chunks = chunkArray(studentIds, BEAMS_BATCH_LIMIT);
            for (const chunk of chunks) {
                try {
                    await beamsClient.publishToUsers(chunk, payload);
                    console.log(`[Attendance Push] Published ${config.status} push notification to ${chunk.length} student(s) at ${instName}`);
                } catch (err) {
                    console.error(`[Attendance Push] Error publishing ${config.status} push batch:`, err);
                }
            }
        }

    } catch (err) {
        console.error("[Attendance Push] Unhandled error sending push notifications:", err);
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get("batchId");
        const dateString = searchParams.get("date");

        if (!batchId || !dateString) {
            return NextResponse.json({ error: "Batch ID and Date are required" }, { status: 400 });
        }

        const date = parseISO(dateString);

        const query = {
            date: {
                $gte: startOfDay(date),
                $lte: endOfDay(date)
            },
            deletedAt: null
        };

        if (batchId !== "all") {
            query.batch = batchId;
        }

        const attendanceDocs = await Attendance.find(query)
            .populate("records.student", "profile.firstName profile.lastName profile.avatar enrollmentNumber email role");

        const records = [];
        attendanceDocs.forEach(doc => {
            (doc.records || []).forEach(r => {
                if (r.student) {
                    records.push({
                        student: r.student,
                        status: r.status,
                        remarks: r.remarks,
                        batchId: doc.batch ? doc.batch.toString() : null
                    });
                }
            });
        });

        return NextResponse.json({ records });

    } catch (error) {
        console.error("Fetch Attendance Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { batchId, date, records } = body;

        if (!batchId || !date || !Array.isArray(records)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const batchDoc = await Batch.findById(batchId).select('institute');
        if (!batchDoc || !batchDoc.institute) {
            return NextResponse.json({ error: "Batch not found or has no institute" }, { status: 404 });
        }

        const targetDate = parseISO(date);

        const recordSchema = records.map(r => ({
            student: r.studentId,
            status: r.status,
            remarks: r.remarks || ""
        }));

        await Attendance.findOneAndUpdate(
            {
                batch: batchId,
                date: {
                    $gte: startOfDay(targetDate),
                    $lte: endOfDay(targetDate)
                }
            },
            {
                $set: {
                    institute: batchDoc.institute,
                    batch: batchId,
                    date: targetDate,
                    records: recordSchema,
                    markedBy: session.user.id,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Asynchronously trigger instant push notifications in the background
        sendAttendancePushNotifications(batchDoc.institute, batchId, records).catch(err => {
            console.error("[Attendance Push] Non-blocking push notification error:", err);
        });

        return NextResponse.json({ success: true, count: records.length });

    } catch (error) {
        console.error("Save Attendance Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
