import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Institute from "@/models/Institute";
import Notification from "@/models/Notification";
import { getBeamsInstance } from "@/lib/pusher";
import { createAuditLog } from "@/services/auditService";

const BEAMS_BATCH_LIMIT = 1000;

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

async function sendNoticePushNotifications(notice, instituteId) {
    try {
        const instituteDoc = await Institute.findById(instituteId).select("name").lean();
        const instName = instituteDoc?.name || "the Institute";

        let targetStudentIds = [];

        if (notice.target === 'all') {
            const students = await User.find({
                institute: instituteId,
                role: 'student',
                deletedAt: null
            }).distinct('_id');
            targetStudentIds = students.map(s => s.toString());
        } else if (notice.target === 'batches' && Array.isArray(notice.targetIds) && notice.targetIds.length > 0) {
            const batches = await Batch.find({
                _id: { $in: notice.targetIds },
                institute: instituteId
            }).select('enrolledStudents');
            const studentIdSet = new Set();
            for (const b of batches) {
                for (const e of b.enrolledStudents || []) {
                    if (e.student && e.status === 'active') {
                        studentIdSet.add(e.student.toString());
                    }
                }
            }
            targetStudentIds = Array.from(studentIdSet);
        } else if (notice.target === 'courses' && Array.isArray(notice.targetIds) && notice.targetIds.length > 0) {
            const batches = await Batch.find({
                course: { $in: notice.targetIds },
                institute: instituteId
            }).select('enrolledStudents');
            const studentIdSet = new Set();
            for (const b of batches) {
                for (const e of b.enrolledStudents || []) {
                    if (e.student && e.status === 'active') {
                        studentIdSet.add(e.student.toString());
                    }
                }
            }
            targetStudentIds = Array.from(studentIdSet);
        }

        if (targetStudentIds.length === 0) return;

        const beamsClient = await getBeamsInstance(instituteId);
        if (!beamsClient) return;

        const cleanBody = (notice.content || '').replace(/<[^>]*>?/gm, '').slice(0, 160);
        const title = `📢 Notice: ${notice.title}`;
        const body = cleanBody ? `${cleanBody}...` : `A new notice has been published by ${instName}.`;

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
                    type: "notice",
                    noticeId: notice._id.toString(),
                    instituteId: instituteId.toString()
                },
                priority: "high"
            },
            web: {
                notification: {
                    title,
                    body,
                    deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/notices`
                }
            }
        };

        // Save to MongoDB database for student app history
        try {
            const dbNotifs = targetStudentIds.map(stId => ({
                institute: instituteId,
                recipient: stId,
                recipientRole: "student",
                title,
                message: body,
                type: "NOTICE",
                metadata: { noticeId: notice._id.toString() }
            }));
            await Notification.insertMany(dbNotifs);
            console.log(`[Notice Push] Saved ${dbNotifs.length} database notification record(s) for notice: ${notice.title}`);
        } catch (dbErr) {
            console.error("[Notice Push] DB Save error:", dbErr);
        }

        const chunks = chunkArray(targetStudentIds, BEAMS_BATCH_LIMIT);
        for (const chunk of chunks) {
            try {
                await beamsClient.publishToUsers(chunk, payload);
                console.log(`[Notice Push] Dispatched notice notification to ${chunk.length} student(s) at ${instName}`);
            } catch (err) {
                console.error("[Notice Push] Error publishing batch:", err);
            }
        }
    } catch (err) {
        console.error("[Notice Push] Unhandled error:", err);
    }
}

/**
 * @route   GET /api/v1/notices
 * @desc    Get all notices for the institute (Admin View)
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const notices = await Notice.find({ 
            institute: session.user.institute.id 
        }).sort({ isPinned: -1, createdAt: -1 });

        return NextResponse.json({ notices });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/notices
 * @desc    Create a new notice
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('manage_notices')));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        await connectDB();

        const instId = session.user.institute.id;

        const notice = await Notice.create({
            ...body,
            institute: instId,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'notice.create',
            resource: { type: 'Notice', id: notice._id },
            institute: instId,
            details: { title: notice.title, target: notice.target }
        });

        // Trigger background push notification to targeted students
        sendNoticePushNotifications(notice, instId).catch(err => {
            console.error("[Notice Push] Non-blocking push notification error:", err);
        });

        return NextResponse.json({ message: "Notice created successfully", notice });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

