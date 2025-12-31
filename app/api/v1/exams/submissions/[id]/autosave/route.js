import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ExamSubmission from '@/models/ExamSubmission';

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        await connectDB();

        const { id: submissionId } = await params;
        const body = await req.json();
        const { answers } = body;

        const submission = await ExamSubmission.findOne({
            _id: submissionId,
            student: session.user.id,
            status: 'in_progress'
        });

        if (!submission) {
            return Response.json({ error: 'Submission not found or closed' }, { status: 404 });
        }

        // Update draft answers
        submission.draftAnswers = answers;
        submission.lastAutoSaveAt = new Date();

        // Also update main answers to keep them in sync? 
        // Usually draftAnswers separation is good if we want "commits", 
        // but the final submit will likely just take the current state.
        // For simplicity, let's keep draftAnswers as the restore point.

        await submission.save();

        return Response.json({ success: true, savedAt: submission.lastAutoSaveAt });

    } catch (error) {
        console.error('Autosave error:', error);
        return Response.json({ error: 'Autosave failed' }, { status: 500 });
    }
}
