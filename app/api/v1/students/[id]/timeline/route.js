import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import StudentTimeline from '@/models/StudentTimeline';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id: studentId } = await params;

        // Security check: Students can only view their own timeline
        if (session.user.role === 'student' && session.user.id !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        await connectDB();

        const query = {
            student: studentId,
            institute: scope.instituteId,
            deletedAt: null
        };

        if (category) {
            query.category = category;
        }

        // If requester is a student, only show approved entries or pending entries created by themselves
        if (session.user.role === 'student') {
            query.$or = [
                { status: 'approved' },
                { createdBy: session.user.id }
            ];
        } else if (status) {
            query.status = status;
        }

        const events = await StudentTimeline.find(query)
            .populate('createdBy', 'fullName profile.firstName profile.lastName')
            .sort({ date: -1 });

        return NextResponse.json({ events });
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
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id: studentId } = await params;
        const body = await req.json();
        const { title, description, category, photoUrl, date } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
        }

        await connectDB();

        let eventStatus = 'approved';
        let eventCategory = category || 'general';

        if (session.user.role === 'student') {
            // Students can only post on their own timeline, and it must be pending + achievement only
            if (session.user.id !== studentId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            eventStatus = 'pending';
            eventCategory = 'achievement';
        } else {
            // Admins/Instructors can post any event directly
            if (!['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const event = await StudentTimeline.create({
            student: studentId,
            institute: scope.instituteId,
            title,
            description,
            category: eventCategory,
            photoUrl: photoUrl || '',
            status: eventStatus,
            date: date ? new Date(date) : new Date(),
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.create',
            resource: { type: 'StudentTimeline', id: event._id },
            institute: scope.instituteId,
            details: { studentId, title, category: eventCategory, status: eventStatus }
        });

        // Trigger push notification if event is approved (e.g. added by faculty/admin)
        if (eventStatus === 'approved') {
            (async () => {
                try {
                    const { getBeamsInstance } = await import('@/lib/pusher');
                    const beamsClient = await getBeamsInstance(scope.instituteId);
                    if (beamsClient) {
                        const notifTitle = `⭐ New Timeline Event: ${title}`;
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
                                    instituteId: scope.instituteId.toString()
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
