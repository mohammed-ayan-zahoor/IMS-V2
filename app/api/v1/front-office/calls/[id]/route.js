import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PhoneCallLog from '@/models/PhoneCallLog';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id } = params;
        const body = await req.json();
        const { type, callerName, callerPhone, receiverName, purpose, date, duration, followUpRequired, followUpDate, notes } = body;

        await connectDB();

        const call = await PhoneCallLog.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!call) {
            return NextResponse.json({ error: 'Call log entry not found' }, { status: 404 });
        }

        const updates = {};
        if (type !== undefined) updates.type = type;
        if (callerName !== undefined) updates.callerName = callerName;
        if (callerPhone !== undefined) updates.callerPhone = callerPhone;
        if (receiverName !== undefined) updates.receiverName = receiverName;
        if (purpose !== undefined) updates.purpose = purpose;
        if (date !== undefined) updates.date = new Date(date);
        if (duration !== undefined) updates.duration = parseInt(duration, 10);
        if (followUpRequired !== undefined) updates.followUpRequired = !!followUpRequired;
        if (followUpDate !== undefined) {
            updates.followUpDate = followUpDate ? new Date(followUpDate) : null;
        }
        if (notes !== undefined) updates.notes = notes;

        const updatedCall = await PhoneCallLog.findByIdAndUpdate(id, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'phone_call_log.update',
            resource: { type: 'PhoneCallLog', id },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ call: updatedCall });
    } catch (error) {
        console.error('API Error [Call PATCH]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { id } = params;
        await connectDB();

        const call = await PhoneCallLog.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!call) {
            return NextResponse.json({ error: 'Call log entry not found' }, { status: 404 });
        }

        call.deletedAt = new Date();
        await call.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'phone_call_log.delete',
            resource: { type: 'PhoneCallLog', id },
            institute: scope.instituteId
        });

        return NextResponse.json({ message: 'Call log entry deleted successfully' });
    } catch (error) {
        console.error('API Error [Call DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
