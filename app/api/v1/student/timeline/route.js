import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import StudentTimeline from '@/models/StudentTimeline';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

function resolveInstituteId(scope, session) {
    return (
        scope?.instituteId ||
        session?.user?.instituteId ||
        session?.user?.institute?.id ||
        session?.user?.institute?._id ||
        (typeof session?.user?.institute === 'string' ? session.user.institute : null)
    );
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role?.toLowerCase();
        if (userRole !== 'student') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const scope = await getInstituteScope(req);
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) {
            return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });
        }

        await connectDB();

        const safeStudentId = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;
        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const query = {
            student: safeStudentId,
            institute: safeInstId,
            deletedAt: null,
            $or: [
                { status: 'approved' },
                { createdBy: safeStudentId }
            ]
        };

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

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role?.toLowerCase();
        if (userRole !== 'student') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const scope = await getInstituteScope(req);
        const instituteId = resolveInstituteId(scope, session);
        if (!instituteId) {
            return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });
        }

        const body = await req.json();
        const { title, description, photoUrl, date } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
        }

        await connectDB();

        const safeStudentId = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;
        const safeInstId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const event = await StudentTimeline.create({
            student: safeStudentId,
            institute: safeInstId,
            title,
            description,
            category: 'achievement',
            photoUrl: photoUrl || '',
            status: 'pending',
            date: date ? new Date(date) : new Date(),
            createdBy: safeStudentId
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'student_timeline.create',
            resource: { type: 'StudentTimeline', id: event._id },
            institute: safeInstId,
            details: { studentId: session.user.id, title, category: 'achievement', status: 'pending' }
        });

        return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
        console.error('API Error [StudentTimeline POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
