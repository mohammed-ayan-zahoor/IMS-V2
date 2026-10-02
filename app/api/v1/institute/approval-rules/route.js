import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { getInstituteScope } from '@/middleware/instituteScope';
import { checkApproval } from '@/lib/approvalGuard';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const institute = await Institute.findById(scope.instituteId).select('settings.approvalRules');
        const rules = institute?.settings?.approvalRules || { discount: false };

        return NextResponse.json({ rules });
    } catch (error) {
        console.error("GET /api/v1/institute/approval-rules error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { rules } = body;

        if (!rules || typeof rules !== 'object') {
            return NextResponse.json({ error: "Invalid rules object" }, { status: 400 });
        }

        // Check if changing approval rules requires master admin approval
        const guard = await checkApproval({
            session,
            action: 'approval_settings',
            resourceType: 'Institute',
            resourceId: scope.instituteId,
            payload: { rules }
        });

        if (!guard.proceed) {
            return NextResponse.json({
                pending: true,
                alreadyPending: guard.alreadyPending,
                requestId: guard.requestId,
                message: "Approval rule change sent to Master Admin for approval"
            }, { status: 202 });
        }

        await Institute.findByIdAndUpdate(scope.instituteId, {
            $set: { 'settings.approvalRules': rules }
        });

        return NextResponse.json({ success: true, rules });
    } catch (error) {
        console.error("PUT /api/v1/institute/approval-rules error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
