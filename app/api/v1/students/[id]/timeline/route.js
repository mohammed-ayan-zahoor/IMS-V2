import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import StudentTimeline from '@/models/StudentTimeline';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

const ALLOWED_STAFF_ROLES = ['admin', 'super_admin', 'instructor', 'teacher', 'staff'];

function resolveInstituteId(scope, session) {
    return (
        scope?.instituteId ||
        session?.user?.instituteId ||
        session?.user?.institute?.id ||
        session?.user?.institute?._id ||
        (typeof session?.user?.institute === 'string' ? session.user.institute : null)
    );
}

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id: studentId } = await params;
        const userRole = session.user.role?.toLowerCase();

        // Security check: Students can only view their own timeline
        if (userRole === 'student' && session.user.id !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        await connectDB();

        const safeStudentId = mongoose.Types.ObjectId.isValid(studentId)
            ? new mongoose.Types.ObjectId(studentId)
            : studentId;
        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const query = {
            student: safeStudentId,
            institute: safeInstId,
            deletedAt: null
        };

        if (category) {
            query.category = category;
        }

        // If requester is a student, only show approved entries or pending entries created by themselves
        if (userRole === 'student') {
            const safeUserId = mongoose.Types.ObjectId.isValid(session.user.id)
                ? new mongoose.Types.ObjectId(session.user.id)
                : session.user.id;
            query.$or = [
                { status: 'approved' },
                { createdBy: safeUserId }
            ];
        } else if (status) {
            query.status = status;
        }

        const events = await StudentTimeline.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName email name')
            .sort({ date: -1 });

        const formattedEvents = events.map(e => {
            const doc = e.toObject ? e.toObject() : e;
            if (doc.createdBy && !doc.createdBy.fullName) {
                const p = doc.createdBy.profile;
                doc.createdBy.fullName = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (doc.createdBy.name || 'Staff');
            }
            return doc;
        });

        return NextResponse.json({ events: formattedEvents });
    } catch (error) {
        console.error('API Error [StudentTimeline GET]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id: studentId } = await params;
        const body = await req.json();
        const { title, description, category, photoUrl, date } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
        }

        await connectDB();

        let eventStatus = 'approved';
        let eventCategory = category || 'general';
        const userRole = session.user.role?.toLowerCase();

        if (userRole === 'student') {
            // Students can only post on their own timeline, and it must be pending + achievement only
            if (session.user.id !== studentId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            eventStatus = 'pending';
            eventCategory = 'achievement';
        } else if (ALLOWED_STAFF_ROLES.includes(userRole)) {
            // Admins, Instructors, Teachers, Staff can post approved events directly
            eventStatus = 'approved';
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const safeStudentId = mongoose.Types.ObjectId.isValid(studentId)
            ? new mongoose.Types.ObjectId(studentId)
            : studentId;
        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;
        const safeCreatedBy = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;

        const event = await StudentTimeline.create({
            student: safeStudentId,
            institute: safeInstId,
            title,
            description,
            category: eventCategory,
            photoUrl: photoUrl || '',
            status: eventStatus,
            date: date ? new Date(date) : new Date(),
            createdBy: safeCreatedBy
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.create',
            resource: { type: 'StudentTimeline', id: event._id },
            institute: safeInstId,
            details: { studentId, title, category: eventCategory, status: eventStatus }
        });

        // Trigger push notification if event is approved (e.g. added by faculty/admin)
        if (eventStatus === 'approved') {
            (async () => {
                try {
                    const { getBeamsInstance } = await import('@/lib/pusher');
                    const beamsClient = await getBeamsInstance(instituteId);
                    if (beamsClient) {
                        const notifTitle = `New Timeline Event: ${title}`;
                        const notifBody = description.slice(0, 140);
                        const payload = {
                            apns: {
                                aps: {
                                    alert: { title: notifTitle, body: notifBody },
                                    sound: "default"
                                }
                            },
                            fcm: {
                                notification: {
                                    title: notifTitle,
                                    body: notifBody,
                                    channel_id: "high_importance_channel",
                                    sound: "default"
                                },
                                data: {
                                    title: notifTitle,
                                    body: notifBody,
                                    type: "timeline",
                                    eventId: event._id.toString(),
                                    instituteId: instituteId.toString()
                                },
                                priority: "high"
                            },
                            web: {
                                notification: {
                                    title: notifTitle,
                                    body: notifBody,
                                    deep_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in"}/student/timeline`
                                }
                            }
                        };
                        await beamsClient.publishToUsers([studentId.toString()], payload);
                        console.log(`[Timeline Push] Sent timeline notification to student ${studentId}`);
                    }
                } catch (pushErr) {
                    console.error('[Timeline Push] Error sending push notification:', pushErr);
                }
            })().catch(() => {});
        }

        return NextResponse.json({ event });
    } catch (error) {
        console.error('API Error [StudentTimeline POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
