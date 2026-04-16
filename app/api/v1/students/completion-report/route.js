import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getCompletionReport } from '@/services/completionService';

/**
 * GET /api/v1/students/completion-report
 * Query params: status, startDate, endDate, includeMetrics
 * Auth: Admin only
 */
export async function GET(req) {
    try {
        await connectDB();
        
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user;

        // 2. Role check (Admin access required)
        if (!['admin', 'super_admin'].includes(user.role)) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        // 3. Parse and validate query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const includeMetrics = searchParams.get('includeMetrics') === 'true';

        // 4. Force institutionId from session unless super_admin specifically requests another
        let institutionId = user.institute;
        const requestedInstitute = searchParams.get('institutionId');
        
        if (user.role === 'super_admin' && requestedInstitute) {
            institutionId = requestedInstitute;
        }

        if (!institutionId) {
            return NextResponse.json({ success: false, message: 'Institution ID required' }, { status: 400 });
        }

        // 5. Call service
        const result = await getCompletionReport(institutionId, {
            status,
            startDate,
            endDate,
            includeMetrics
        });

        if (!result.success) {
            return NextResponse.json(result, { status: result.code || 500 });
        }

        return NextResponse.json(result.data, { status: 200 });

    } catch (error) {
        console.error('Completion Report API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
