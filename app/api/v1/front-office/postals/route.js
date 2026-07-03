import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Postal from '@/models/Postal';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // dispatch, receive
        const search = searchParams.get('search');
        const postalType = searchParams.get('postalType');

        await connectDB();

        const query = {
            institute: scope.instituteId,
            deletedAt: null
        };

        if (type) {
            query.type = type;
        }

        if (postalType) {
            query.postalType = postalType;
        }

        if (search) {
            query.$or = [
                { referenceNo: { $regex: search, $options: 'i' } },
                { senderName: { $regex: search, $options: 'i' } },
                { receiverName: { $regex: search, $options: 'i' } },
                { toFrom: { $regex: search, $options: 'i' } }
            ];
        }

        const postals = await Postal.find(query).sort({ date: -1 });
        return NextResponse.json({ postals });
    } catch (error) {
        console.error('API Error [Postals GET]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const body = await req.json();
        const { type, referenceNo, senderName, senderAddress, receiverName, receiverAddress, date, postalType, toFrom, remarks, attachmentUrl } = body;

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 });
        }

        await connectDB();

        const postal = await Postal.create({
            institute: scope.instituteId,
            type,
            referenceNo,
            senderName,
            senderAddress,
            receiverName,
            receiverAddress,
            date: date ? new Date(date) : new Date(),
            postalType: postalType || 'courier',
            toFrom,
            remarks,
            attachmentUrl,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'postal.create',
            resource: { type: 'Postal', id: postal._id },
            institute: scope.instituteId,
            details: { referenceNo, type }
        });

        return NextResponse.json({ postal });
    } catch (error) {
        console.error('API Error [Postals POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
