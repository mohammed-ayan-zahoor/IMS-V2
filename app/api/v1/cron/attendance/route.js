import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Institute from "@/models/Institute";
import { getBeamsInstance } from "@/lib/pusher";
import { startOfDay, endOfDay } from "date-fns";

const CRON_SECRET = process.env.CRON_SECRET || "ims_cron_secret_2026";
const BEAMS_BATCH_LIMIT = 1000;

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

export async function GET(req) {
    return handleAttendanceCron(req);
}

export async function POST(req) {
    return handleAttendanceCron(req);
}

async function handleAttendanceCron(req) {
    try {
        const { searchParams } = new URL(req.url);
        const secretParam = searchParams.get("secret");
        const secretHeader = req.headers.get("x-cron-secret");
        const authHeader = req.headers.get("authorization");
        const token = authHeader ? authHeader.replace("Bearer ", "") : null;

        // Security check: support x-cron-secret, ?secret=, or Bearer token
        const validSecrets = [CRON_SECRET, process.env.CRON_SECRET_KEY || "super-secret-cron-key"];
        const isAuthorized = validSecrets.includes(secretParam) || 
                             validSecrets.includes(secretHeader) || 
                             validSecrets.includes(token);

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized: Invalid cron secret" }, { status: 401 });
        }

        await connectDB();

        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        // Find all attendance records marked today across all institutes
        const attendanceDocs = await Attendance.find({
            date: { $gte: dayStart, $lte: dayEnd },
            deletedAt: null
        }).populate("institute", "name settings");

        if (!attendanceDocs || attendanceDocs.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No attendance records found for today",
                count: 0
            });
        }

        // Group by institute -> status -> unique student IDs
        const instituteGroups = {};

        for (const doc of attendanceDocs) {
            if (!doc.institute || !doc.records || doc.records.length === 0) continue;

            const instId = doc.institute._id.toString();
            const instName = doc.institute.name || "the Institute";
            const pushConfig = doc.institute.settings?.attendance?.pushNotifications;
            
            if (!instituteGroups[instId]) {
                instituteGroups[instId] = {
                    instituteId: instId,
                    instituteName: instName,
                    pushConfig: {
                        onPresent: pushConfig?.onPresent ?? true,
                        onAbsent: pushConfig?.onAbsent ?? true,
                        onLate: pushConfig?.onLate ?? true
                    },
                    statusGroups: {
                        present: new Set(),
                        absent: new Set(),
                        late: new Set()
                    }
                };
            }

            for (const r of doc.records) {
                if (!r.student || !r.status) continue;
                const s = r.status.toLowerCase();
                if (s in instituteGroups[instId].statusGroups) {
                    instituteGroups[instId].statusGroups[s].add(r.student.toString());
                }
            }
        }

        let totalPushed = 0;
        const summary = [];

        for (const [instId, group] of Object.entries(instituteGroups)) {
            const beamsClient = await getBeamsInstance(instId);
            if (!beamsClient) continue;

            const configs = [
                {
                    status: "present",
                    enabled: group.pushConfig.onPresent === true,
                    title: "✅ Attendance Status",
                    body: `Your attendance at ${group.instituteName} was recorded as Present today.`
                },
                {
                    status: "absent",
                    enabled: group.pushConfig.onAbsent === true,
                    title: "⚠️ Attendance Alert",
                    body: `Notice: You were marked Absent at ${group.instituteName} today.`
                },
                {
                    status: "late",
                    enabled: group.pushConfig.onLate === true,
                    title: "⏰ Attendance Alert",
                    body: `Notice: You were marked Late at ${group.instituteName} today.`
                }
            ];

            for (const c of configs) {
                if (!c.enabled) continue;
                const studentIds = Array.from(group.statusGroups[c.status]);
                if (studentIds.length === 0) continue;

                const payload = {
                    apns: {
                        aps: {
                            alert: { title: c.title, body: c.body },
                            sound: "default"
                        }
                    },
                    fcm: {
                        notification: {
                            title: c.title,
                            body: c.body,
                            channel_id: "high_importance_channel",
                            sound: "default"
                        },
                        data: {
                            title: c.title,
                            body: c.body,
                            type: "attendance",
                            status: c.status,
                            instituteId: instId
                        },
                        priority: "high"
                    },
                    web: {
                        notification: {
                            title: c.title,
                            body: c.body,
                            deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/attendance`
                        }
                    }
                };

                const chunks = chunkArray(studentIds, BEAMS_BATCH_LIMIT);
                for (const chunk of chunks) {
                    try {
                        await beamsClient.publishToUsers(chunk, payload);
                        totalPushed += chunk.length;
                        summary.push({
                            institute: group.instituteName,
                            status: c.status,
                            count: chunk.length
                        });
                    } catch (err) {
                        console.error(`[Attendance Cron] Error publishing ${c.status} for ${group.instituteName}:`, err.message);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Attendance notifications processed. Sent ${totalPushed} notifications.`,
            totalPushed,
            summary
        });

    } catch (error) {
        console.error("[Attendance Cron] Execution error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
