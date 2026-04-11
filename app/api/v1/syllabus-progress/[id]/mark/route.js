import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SyllabusService } from '@/services/syllabusService';
import BatchSyllabusProgress from '@/models/BatchSyllabusProgress';
import Batch from '@/models/Batch';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/v1/syllabus-progress/[id]/mark
 * Mark or unmark a syllabus item for a batch.
 * Role: instructor (must be assigned to the batch) OR admin/super_admin.
 *
 * Body: { itemId, itemType, chapterId, topicId?, isCompleted, notes? }
 */
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();

        // Fetch the progress doc to get the batch, then verify the instructor
        const progressDoc = await BatchSyllabusProgress.findById(id).lean();
        if (!progressDoc) {
            return NextResponse.json({ error: 'Progress tracker not found' }, { status: 404 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(session.user.role);

        if (!isAdmin) {
            // Must be an instructor AND must be the assigned instructor of this batch
            if (session.user.role !== 'instructor') {
                return NextResponse.json({ error: 'Only instructors and admins can mark progress' }, { status: 403 });
            }

            const batch = await Batch.findById(progressDoc.batch).lean();
            if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

            const isAssignedInstructor = String(batch.instructor) === String(session.user.id);
            if (!isAssignedInstructor) {
                return NextResponse.json({ error: 'You are not the assigned instructor for this batch' }, { status: 403 });
            }
        }

        const body = await req.json();
        const { itemId, itemType, chapterId, topicId, isCompleted, notes } = body;

        if (!itemId || !itemType || !chapterId) {
            return NextResponse.json({ error: 'itemId, itemType, and chapterId are required' }, { status: 400 });
        }
        if (!['chapter', 'topic', 'subtopic'].includes(itemType)) {
            return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 });
        }

        const updated = await SyllabusService.markItem(id, {
            itemId, itemType, chapterId, topicId, isCompleted, notes
        }, session.user.id);

        return NextResponse.json({ progress: updated });
    } catch (error) {
        console.error('Mark syllabus item error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
