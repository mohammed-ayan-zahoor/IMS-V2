import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Complaint from '@/models/Complaint';
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
        const { complainantName, complainantPhone, complainantType, relatedStudent, category, description, assignedTo, status, resolution } = body;

        await connectDB();

        const complaint = await Complaint.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        const updates = {};
        if (complainantName !== undefined) updates.complainantName = complainantName;
        if (complainantPhone !== undefined) updates.complainantPhone = complainantPhone;
        if (complainantType !== undefined) updates.complainantType = complainantType;
        if (relatedStudent !== undefined) updates.relatedStudent = relatedStudent || null;
        if (category !== undefined) updates.category = category;
        if (description !== undefined) updates.description = description;
        if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
        
        if (status !== undefined) {
            updates.status = status;
            if (status === 'resolved' || status === 'closed') {
                updates.resolvedAt = new Date();
            } else {
                updates.resolvedAt = null;
            }
        }
        
        if (resolution !== undefined) updates.resolution = resolution;

        const updatedComplaint = await Complaint.findByIdAndUpdate(id, updates, { new: true });

        await createAuditLog({
            actor: session.user.id,
            action: 'complaint.update',
            resource: { type: 'Complaint', id },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ complaint: updatedComplaint });
    } catch (error) {
        console.error('API Error [Complaint PATCH]:', error);
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

        const complaint = await Complaint.findOne({ _id: id, institute: scope.instituteId, deletedAt: null });
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        complaint.deletedAt = new Date();
        await complaint.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'complaint.delete',
            resource: { type: 'Complaint', id },
            institute: scope.instituteId
        });

        return NextResponse.json({ message: 'Complaint deleted successfully' });
    } catch (error) {
        console.error('API Error [Complaint DELETE]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
