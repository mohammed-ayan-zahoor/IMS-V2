import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Fee from '@/models/Fee';
import { createAuditLog } from '@/services/auditService';
import { getInstituteScope } from '@/lib/utils'; // Assuming this utility exists, similar to other routes

export async function DELETE(req, { params }) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
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
                studentName: fee.student?.profile ? `${fee.student.profile.firstName || ''} ${fee.student.profile.lastName || ''}`.trim() : 'Unknown Student',
                amount: fee.totalAmount,
                paidAmount: fee.paidAmount
            }
        });

        return NextResponse.json({ success: true, message: "Fee record deleted successfully" });

    } catch (error) {
        console.error("Fee Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete fee record" }, { status: 500 });
    }
}
