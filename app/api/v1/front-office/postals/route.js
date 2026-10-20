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
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (['instructor', 'staff'].includes(session.user.role) && session.user.permissions?.includes('view_front_office')));
        if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // dispatch, receive
        const search = searchParams.get('search');
        const postalType = searchParams.get('postalType');
        const dateRange = searchParams.get('dateRange'); // 'today', 'yesterday', 'week', 'month', 'all'

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

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (dateRange === 'today') {
            query.date = { $gte: todayStart, $lte: todayEnd };
        } else if (dateRange === 'yesterday') {
            const yStart = new Date();
            yStart.setDate(yStart.getDate() - 1);
            yStart.setHours(0, 0, 0, 0);
            const yEnd = new Date();
            yEnd.setDate(yEnd.getDate() - 1);
            yEnd.setHours(23, 59, 59, 999);
            query.date = { $gte: yStart, $lte: yEnd };
        } else if (dateRange === 'week' || dateRange === '7days') {
            const wStart = new Date();
            wStart.setDate(wStart.getDate() - 7);
            wStart.setHours(0, 0, 0, 0);
            query.date = { $gte: wStart };
        } else if (dateRange === 'month') {
            const mStart = new Date();
            mStart.setDate(1);
            mStart.setHours(0, 0, 0, 0);
            query.date = { $gte: mStart };
        }

        const [postals, receivedCount, dispatchedCount, totalToday, totalAllTime] = await Promise.all([
            Postal.find(query).sort({ date: -1 }).lean(),
            Postal.countDocuments({ institute: scope.instituteId, deletedAt: null, type: 'receive' }),
            Postal.countDocuments({ institute: scope.instituteId, deletedAt: null, type: 'dispatch' }),
            Postal.countDocuments({ institute: scope.instituteId, deletedAt: null, date: { $gte: todayStart, $lte: todayEnd } }),
            Postal.countDocuments({ institute: scope.instituteId, deletedAt: null })
        ]);

        return NextResponse.json({
            postals,
            stats: {
                receivedCount,
                dispatchedCount,
                totalToday,
                totalAllTime
            }
        });
    } catch (error) {
        console.error('API Error [Postals GET]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (['instructor', 'staff'].includes(session.user.role) && session.user.permissions?.includes('view_front_office')));
        if (!hasAccess) {
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
