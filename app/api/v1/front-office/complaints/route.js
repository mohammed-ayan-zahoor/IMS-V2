import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Complaint from '@/models/Complaint';
import Counter from '@/models/Counter';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        await connectDB();

        const query = {
            institute: scope.instituteId,
            deletedAt: null
        };

        if (status) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { complaintNo: { $regex: search, $options: 'i' } },
                { complainantName: { $regex: search, $options: 'i' } },
                { complainantPhone: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const complaints = await Complaint.find(query)
            .populate('relatedStudent', 'fullName profile.firstName profile.lastName')
            .populate('assignedTo', 'fullName profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ complaints });
    } catch (error) {
        console.error('API Error [Complaints GET]:', error);
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
        const { complainantName, complainantPhone, complainantType, relatedStudent, category, description, assignedTo } = body;

        if (!complainantName || !description) {
            return NextResponse.json({ error: 'Complainant Name and Description are required' }, { status: 400 });
        }

        await connectDB();

        // Increment complaint number sequence
        const counter = await Counter.findByIdAndUpdate(
            `complaint_${scope.instituteId}`,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const complaintNo = `CMP-${String(counter.seq).padStart(4, '0')}`;

        const complaint = await Complaint.create({
            institute: scope.instituteId,
            complaintNo,
            complainantName,
            complainantPhone,
            complainantType: complainantType || 'other',
            relatedStudent: relatedStudent || null,
            category: category || 'other',
            description,
            assignedTo: assignedTo || null,
            status: 'open',
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'complaint.create',
            resource: { type: 'Complaint', id: complaint._id },
            institute: scope.instituteId,
            details: { complaintNo, complainantName }
        });

        return NextResponse.json({ complaint });
    } catch (error) {
        console.error('API Error [Complaints POST]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
