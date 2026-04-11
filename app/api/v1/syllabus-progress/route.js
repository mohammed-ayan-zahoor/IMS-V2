import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstituteScope } from '@/middleware/instituteScope';
import { SyllabusService } from '@/services/syllabusService';

/**
 * GET /api/v1/syllabus-progress?batchId=xxx
 * Returns all progress records for a batch (all subjects).
 *
 * GET /api/v1/syllabus-progress?batchId=xxx&subjectId=yyy
 * Returns progress for a specific (batch, subject) pair.
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');
        const subjectId = searchParams.get('subjectId');

        if (!batchId) {
            return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
        }

        if (subjectId) {
            const progress = await SyllabusService.getProgress(batchId, subjectId);
            return NextResponse.json({ progress });
        }

        const progressList = await SyllabusService.getProgressForBatch(batchId);
        return NextResponse.json({ progressList });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

/**
 * POST /api/v1/syllabus-progress
 * Lazily create or fetch the progress tracker for a (batch, subject) pair.
 * Body: { batchId, subjectId }
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { batchId, subjectId } = await req.json();
        if (!batchId || !subjectId) {
            return NextResponse.json({ error: 'batchId and subjectId are required' }, { status: 400 });
        }

        const progress = await SyllabusService.getOrCreateProgress(batchId, subjectId, scope.instituteId);
        return NextResponse.json({ progress });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
