import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ApprovalRequest from '@/models/ApprovalRequest';
import User from '@/models/User';
import { getInstituteScope } from '@/middleware/instituteScope';

export async function GET(req) {
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = (page - 1) * limit;

        const query = { institute: scope.instituteId };
        if (status !== 'all') {
            query.status = status;
        }

        const [requests, total, pendingCount] = await Promise.all([
            ApprovalRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('requestedBy', 'name email profile avatar')
                .populate('reviewedBy', 'name email profile avatar')
                .lean(),
            ApprovalRequest.countDocuments(query),
            ApprovalRequest.countDocuments({ institute: scope.instituteId, status: 'pending' })
        ]);

        return NextResponse.json({
            requests,
            total,
            pendingCount,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("GET /api/v1/approvals error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
