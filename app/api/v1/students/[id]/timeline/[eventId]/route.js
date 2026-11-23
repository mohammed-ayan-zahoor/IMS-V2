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

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { eventId } = await params;
        const body = await req.json();
        const { title, description, category, photoUrl, status, date } = body;
        const userRole = session.user.role?.toLowerCase();

        await connectDB();

        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const event = await StudentTimeline.findOne({
            _id: eventId,
            institute: safeInstId,
            deletedAt: null
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const updates = {};

        // Security check
        if (userRole === 'student') {
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
        } else if (ALLOWED_STAFF_ROLES.includes(userRole)) {
            // Admins, Instructors, Teachers, Staff can edit any field, including status (for approvals)
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (category !== undefined) updates.category = category;
            if (photoUrl !== undefined) updates.photoUrl = photoUrl;
            if (status !== undefined) updates.status = status;
            if (date !== undefined) updates.date = new Date(date);
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedEvent = await StudentTimeline.findByIdAndUpdate(eventId, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.update',
            resource: { type: 'StudentTimeline', id: eventId },
            institute: safeInstId,
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
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { eventId } = await params;
        const userRole = session.user.role?.toLowerCase();

        await connectDB();

        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const event = await StudentTimeline.findOne({
            _id: eventId,
            institute: safeInstId,
            deletedAt: null
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Security check: Student can delete their own pending event; staff/teachers can delete any
        if (userRole === 'student') {
            if (event.student.toString() !== session.user.id || event.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (event.status !== 'pending') {
                return NextResponse.json({ error: 'Cannot delete approved events' }, { status: 400 });
            }
        } else if (!ALLOWED_STAFF_ROLES.includes(userRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        event.deletedAt = new Date();
        await event.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.delete',
            resource: { type: 'StudentTimeline', id: eventId },
            institute: safeInstId
        });

        return NextResponse.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('API Error [StudentTimeline DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
