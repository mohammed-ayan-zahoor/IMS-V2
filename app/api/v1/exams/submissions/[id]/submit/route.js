import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ExamSecurityService } from '@/services/examSecurityService';
import { ExamGradingService } from '@/services/examGradingService';
import ExamSubmission from '@/models/ExamSubmission';

export async function POST(req, { params }) {
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
        }).populate('exam');

        if (!submission) {
            return Response.json({ error: 'Submission not found or already submitted' }, { status: 404 });
        }

        // Validate timing
        const timingCheck = ExamSecurityService.validateSubmissionTime(submission, submission.exam);
        // Even if time exceeded, we accept submission but maybe flag it?
        // Usually we auto-submit when time is up. 
        // If client submits way after grace period, we might reject or mark as late.
        // Let's accept but flag if significantly late?
        // For now, accepting it to prevent data loss, validation prevents standard UI start flow.

        // Update answers
        submission.answers = answers;
        submission.draftAnswers = []; // Clear draft
        submission.submittedAt = new Date();
        submission.status = 'submitted'; // Temporary status before grading

        await submission.save();

        // Trigger Auto-Grading
        const gradeResult = await ExamGradingService.autoGrade(submission._id, null); // System is actor (null)

        return Response.json({
            success: true,
            submissionStatus: gradeResult.submission.status,
            score: gradeResult.submission.score, // Might hide this depending on policy
            needsManualReview: gradeResult.needsManualReview
        });

    } catch (error) {
        console.error('Submission error:', error);
        return Response.json({ error: error.message || 'Submission failed' }, { status: 500 });
    }
}
