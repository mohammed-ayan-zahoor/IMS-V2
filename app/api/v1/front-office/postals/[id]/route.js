import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Postal from '@/models/Postal';
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
        const { type, referenceNo, senderName, senderAddress, receiverName, receiverAddress, date, postalType, toFrom, remarks, attachmentUrl } = body;

        await connectDB();

        const postal = await Postal.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!postal) {
            return NextResponse.json({ error: 'Postal record not found' }, { status: 404 });
        }

        const updates = {};
        if (type !== undefined) updates.type = type;
        if (referenceNo !== undefined) updates.referenceNo = referenceNo;
        if (senderName !== undefined) updates.senderName = senderName;
        if (senderAddress !== undefined) updates.senderAddress = senderAddress;
        if (receiverName !== undefined) updates.receiverName = receiverName;
        if (receiverAddress !== undefined) updates.receiverAddress = receiverAddress;
        if (date !== undefined) updates.date = new Date(date);
        if (postalType !== undefined) updates.postalType = postalType;
        if (toFrom !== undefined) updates.toFrom = toFrom;
        if (remarks !== undefined) updates.remarks = remarks;
        if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl;

        const updatedPostal = await Postal.findByIdAndUpdate(id, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'postal.update',
            resource: { type: 'Postal', id },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ postal: updatedPostal });
    } catch (error) {
        console.error('API Error [Postal PATCH]:', error);
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

        const postal = await Postal.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!postal) {
            return NextResponse.json({ error: 'Postal record not found' }, { status: 404 });
        }

        postal.deletedAt = new Date();
        await postal.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'postal.delete',
            resource: { type: 'Postal', id },
            institute: scope.instituteId
        });

        return NextResponse.json({ message: 'Postal entry deleted successfully' });
    } catch (error) {
        console.error('API Error [Postal DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
