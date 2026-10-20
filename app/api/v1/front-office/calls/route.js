import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PhoneCallLog from '@/models/PhoneCallLog';
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
        const type = searchParams.get('type'); // inbound, outbound
        const search = searchParams.get('search');
        const followUpRequired = searchParams.get('followUpRequired');
        const dateRange = searchParams.get('dateRange'); // 'today', 'yesterday', 'week', 'month', 'all'

        await connectDB();

        const query = {
            institute: scope.instituteId,
            deletedAt: null
        };

        if (type) {
            query.type = type;
        }

        if (followUpRequired === 'true') {
            query.followUpRequired = true;
        }

        if (search) {
            query.$or = [
                { callerName: { $regex: search, $options: 'i' } },
                { callerPhone: { $regex: search, $options: 'i' } },
                { purpose: { $regex: search, $options: 'i' } },
                { receiverName: { $regex: search, $options: 'i' } }
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

        const [calls, inboundCount, outboundCount, followUpCount, totalToday, totalAllTime] = await Promise.all([
            PhoneCallLog.find(query).sort({ date: -1 }).lean(),
            PhoneCallLog.countDocuments({ institute: scope.instituteId, deletedAt: null, type: 'inbound', date: { $gte: todayStart, $lte: todayEnd } }),
            PhoneCallLog.countDocuments({ institute: scope.instituteId, deletedAt: null, type: 'outbound', date: { $gte: todayStart, $lte: todayEnd } }),
            PhoneCallLog.countDocuments({ institute: scope.instituteId, deletedAt: null, followUpRequired: true }),
            PhoneCallLog.countDocuments({ institute: scope.instituteId, deletedAt: null, date: { $gte: todayStart, $lte: todayEnd } }),
            PhoneCallLog.countDocuments({ institute: scope.instituteId, deletedAt: null })
        ]);

        return NextResponse.json({
            calls,
            stats: {
                inboundCount,
                outboundCount,
                followUpCount,
                totalToday,
                totalAllTime
            }
        });
    } catch (error) {
        console.error('API Error [Calls GET]:', error);
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
        const { type, callerName, callerPhone, receiverName, purpose, date, duration, followUpRequired, followUpDate, notes } = body;

        if (!type || !callerName || !callerPhone) {
            return NextResponse.json({ error: 'Type, Caller Name, and Phone are required' }, { status: 400 });
        }

        await connectDB();

        const call = await PhoneCallLog.create({
            institute: scope.instituteId,
            type,
            callerName,
            callerPhone,
            receiverName,
            purpose,
            date: date ? new Date(date) : new Date(),
            duration: duration ? parseInt(duration, 10) : 0,
            followUpRequired: !!followUpRequired,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            notes,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'phone_call_log.create',
            resource: { type: 'PhoneCallLog', id: call._id },
            institute: scope.instituteId,
            details: { callerName, type }
        });

        return NextResponse.json({ call });
    } catch (error) {
        console.error('API Error [Calls POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
