import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId && !scope.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        const query = { _id: id };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const enquiry = await Enquiry.findOne(query);
        if (!enquiry) {
            return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
        }

        // Allowed fields to update via quick actions
        const updates = {};
        if (body.status) updates.status = body.status;
        if (body.followUpDate) updates.followUpDate = new Date(body.followUpDate);
        if (body.notes) updates.notes = body.notes;

        const updatedEnquiry = await Enquiry.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate('course', 'name code');

        // Audit Log
        await createAuditLog({
            actor: session.user.id,
            action: 'enquiry.update',
            resource: { type: 'Enquiry', id: updatedEnquiry._id },
            institute: scope.instituteId,
            details: { updates }
        });

        return NextResponse.json({ success: true, enquiry: updatedEnquiry });
    } catch (error) {
        console.error("Enquiry Update Error:", error.message);
        return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
    }
}
