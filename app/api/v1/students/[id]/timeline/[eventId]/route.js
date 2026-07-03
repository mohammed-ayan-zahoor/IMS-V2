import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import StudentTimeline from '@/models/StudentTimeline';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { eventId } = params;
        const body = await req.json();
        const { title, description, category, photoUrl, status, date } = body;

        await connectDB();

        const event = await StudentTimeline.findOne({
            _id: eventId,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const updates = {};

        // Security check
        if (session.user.role === 'student') {
            // Students can only edit their own pending entries
            if (event.student.toString() !== session.user.id || event.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (event.status !== 'pending') {
                return NextResponse.json({ error: 'Cannot modify approved events' }, { status: 400 });
            }
            
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (photoUrl !== undefined) updates.photoUrl = photoUrl;
            if (date !== undefined) updates.date = new Date(date);
        } else {
            // Admins/Instructors can edit any field, including status (for approvals)
            if (!['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (category !== undefined) updates.category = category;
            if (photoUrl !== undefined) updates.photoUrl = photoUrl;
            if (status !== undefined) updates.status = status;
            if (date !== undefined) updates.date = new Date(date);
        }

        const updatedEvent = await StudentTimeline.findByIdAndUpdate(eventId, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.update',
            resource: { type: 'StudentTimeline', id: eventId },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ event: updatedEvent });
    } catch (error) {
        console.error('API Error [StudentTimeline PATCH]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { eventId } = params;

        await connectDB();

        const event = await StudentTimeline.findOne({
            _id: eventId,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Security check: Student can delete their own pending event; admin/staff can delete any
        if (session.user.role === 'student') {
            if (event.student.toString() !== session.user.id || event.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (event.status !== 'pending') {
                return NextResponse.json({ error: 'Cannot delete approved events' }, { status: 400 });
            }
        } else if (!['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        event.deletedAt = new Date();
        await event.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.delete',
            resource: { type: 'StudentTimeline', id: eventId },
            institute: scope.instituteId
        });

        return NextResponse.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('API Error [StudentTimeline DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
