import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Visitor from '@/models/Visitor';
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
        const { visitorName, phone, purpose, personToMeet, idProof, idNumber, remarks, checkOut, status, checkIn } = body;

        await connectDB();

        const visitor = await Visitor.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!visitor) {
            return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
        }

        const updates = {};
        if (visitorName !== undefined) updates.visitorName = visitorName;
        if (phone !== undefined) updates.phone = phone;
        if (purpose !== undefined) updates.purpose = purpose;
        if (personToMeet !== undefined) updates.personToMeet = personToMeet;
        if (idProof !== undefined) updates.idProof = idProof;
        if (idNumber !== undefined) updates.idNumber = idNumber;
        if (remarks !== undefined) updates.remarks = remarks;
        if (status !== undefined) updates.status = status;
        if (checkIn !== undefined) updates.checkIn = new Date(checkIn);

        if (checkOut !== undefined) {
            updates.checkOut = checkOut ? new Date(checkOut) : null;
        }

        const updatedVisitor = await Visitor.findByIdAndUpdate(id, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'visitor.update',
            resource: { type: 'Visitor', id },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ visitor: updatedVisitor });
    } catch (error) {
        console.error('API Error [Visitor PATCH]:', error);
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

        const visitor = await Visitor.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!visitor) {
            return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
        }

        visitor.deletedAt = new Date();
        await visitor.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'visitor.delete',
            resource: { type: 'Visitor', id },
            institute: scope.instituteId
        });

        return NextResponse.json({ message: 'Visitor entry deleted successfully' });
    } catch (error) {
        console.error('API Error [Visitor DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
