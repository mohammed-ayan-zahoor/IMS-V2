import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ApprovalRequest from '@/models/ApprovalRequest';
import Membership from '@/models/Membership';
import Institute from '@/models/Institute';
import { FeeService } from '@/services/feeService';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        // Only Master Admin or Super Admin can approve/reject
        const masterMembership = await Membership.findOne({
            institute: scope.instituteId,
            user: session.user.id,
            isMasterAdmin: true,
            isActive: true
        });

        if (!masterMembership && session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Only the Master Admin can review approval requests" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { action: reviewAction, note } = body; // 'approve' | 'reject'

        if (!['approve', 'reject'].includes(reviewAction)) {
            return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
        }

        const request = await ApprovalRequest.findOne({
            _id: id,
            institute: scope.instituteId
        });

        if (!request) {
            return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
        }

        if (request.status !== 'pending') {
            return NextResponse.json({ error: `Request has already been ${request.status}` }, { status: 400 });
        }

        if (reviewAction === 'reject') {
            request.status = 'rejected';
            request.reviewedBy = session.user.id;
            request.reviewedAt = new Date();
            request.reviewNote = note || '';
            await request.save();

            return NextResponse.json({ success: true, status: 'rejected' });
        }

        // reviewAction === 'approve': Execute the stored payload
        if (request.action === 'discount') {
            if (!request.resourceId || !request.payload?.discount) {
                return NextResponse.json({ error: "Malformed discount approval payload" }, { status: 400 });
            }

            await FeeService.updateDiscount(
                request.resourceId,
                request.payload.discount,
                session.user.id
            );

            try {
                await createAuditLog({
                    actor: session.user.id,
                    action: 'fee.discount',
                    resource: { type: 'Fee', id: request.resourceId.toString() },
                    institute: scope.instituteId,
                    details: {
                        approvedRequest: request._id.toString(),
                        discount: request.payload.discount,
                        requestedBy: request.requestedBy
                    }
                });
            } catch (auditErr) {
                console.error("Failed to create audit log on discount approval:", auditErr);
            }
        } else if (request.action === 'approval_settings') {
            if (request.payload?.rules) {
                await Institute.findByIdAndUpdate(scope.instituteId, {
                    $set: { 'settings.approvalRules': request.payload.rules }
                });
            }
        }

        request.status = 'approved';
        request.reviewedBy = session.user.id;
        request.reviewedAt = new Date();
        request.reviewNote = note || '';
        await request.save();

        return NextResponse.json({ success: true, status: 'approved' });
    } catch (error) {
        console.error("POST /api/v1/approvals/[id] error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
