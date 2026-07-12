import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Visitor from '@/models/Visitor';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('view_front_office')));
        if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const dateRange = searchParams.get('dateRange'); // 'today', 'week', 'all'

        await connectDB();

        const query = {
            institute: scope.instituteId,
            deletedAt: null
        };

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { visitorName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { purpose: { $regex: search, $options: 'i' } },
                { personToMeet: { $regex: search, $options: 'i' } }
            ];
        }

        if (dateRange === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.checkIn = { $gte: start, $lte: end };
        } else if (dateRange === 'week') {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            query.checkIn = { $gte: start };
        }

        const visitors = await Visitor.find(query).sort({ checkIn: -1 });
        return NextResponse.json({ visitors });
    } catch (error) {
        console.error('API Error [Visitors GET]:', error);
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
        const { visitorName, phone, purpose, personToMeet, idProof, idNumber, remarks, checkIn } = body;

        if (!visitorName || !purpose) {
            return NextResponse.json({ error: 'Name and Purpose are required' }, { status: 400 });
        }

        await connectDB();

        const visitor = await Visitor.create({
            institute: scope.instituteId,
            visitorName,
            phone,
            purpose,
            personToMeet,
            idProof,
            idNumber,
            remarks,
            checkIn: checkIn ? new Date(checkIn) : new Date(),
            status: 'inside',
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'visitor.create',
            resource: { type: 'Visitor', id: visitor._id },
            institute: scope.instituteId,
            details: { visitorName, purpose }
        });

        return NextResponse.json({ visitor });
    } catch (error) {
        console.error('API Error [Visitors POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
