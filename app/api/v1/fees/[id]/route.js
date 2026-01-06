import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Fee from '@/models/Fee';
import { createAuditLog } from '@/services/auditService';
import { getInstituteScope } from '@/middleware/instituteScope';

import { Types } from "mongoose";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID format" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Scope validation
        const query = { _id: id };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const fee = await Fee.findOne(query)
            .populate({
                path: 'batch',
                select: 'name course',
                populate: { path: 'course', select: 'name' }
            })
            .populate('student', 'profile.firstName profile.lastName email enrollmentNumber')
            .populate('institute', 'name branding address contactEmail contactPhone');

        if (!fee) {
            return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
        }

        return NextResponse.json({ fee });

    } catch (error) {
        console.error("Fee Get Error:", error);
        return NextResponse.json({ error: "Failed to fetch fee details" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID format" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Scope validation
        const query = { _id: id };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const fee = await Fee.findOne(query).populate('batch', 'name').populate('student', 'profile.firstName profile.lastName');

        if (!fee) {
            return NextResponse.json({ error: "Fee record not found or access denied" }, { status: 404 });
        }

        // Delete the fee
        await Fee.deleteOne(query);
        // Audit log
        await createAuditLog({
            actor: session.user.id,
            action: 'fee.delete',
            resource: { type: 'Fee', id: id },
            institute: fee.institute,
            details: {
                batchName: fee.batch?.name || 'Unknown Batch',
                studentName: fee.student?.profile ? `${fee.student.profile.firstName || ''} ${fee.student.profile.lastName || ''}`.trim() || 'Unknown Student' : 'Unknown Student', amount: fee.totalAmount,
                paidAmount: fee.paidAmount
            }
        });

        return NextResponse.json({ success: true, message: "Fee record deleted successfully" });

    } catch (error) {
        console.error("Fee Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete fee record" }, { status: 500 });
    }
}
