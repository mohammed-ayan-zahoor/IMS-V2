import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstituteScope } from '@/middleware/instituteScope';
import { SyllabusService } from '@/services/syllabusService';

/**
 * GET /api/v1/syllabus-progress/stale?days=7
 * Returns batches with no syllabus activity in the last N days.
 * Used for the inactivity warning widget on the dashboard.
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '7', 10);

        const stale = await SyllabusService.getStaleBatches(scope.instituteId, days);
        return NextResponse.json({ stale });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
