import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ExamSecurityService } from '@/services/examSecurityService';

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();



        const { id: examId } = await params;

        // Validate access
        const { exam } = await ExamSecurityService.validateExamAccess(
            examId,
            session.user.id
        );

        // Validate timing
        try {
            ExamSecurityService.validateExamTiming(exam);
        } catch (error) {
            // Allow viewing instructions even if early, just show start time
            // But block if 'Exam has ended' could be debatable.
            // Usually instructions are viewable before start.
            // Let's rely on frontend to block "Start" button based on time.
            // But if the service throws "Exam has ended", we might want to allow viewing past status?
            // For now, let's catch only "Exam will start in..." to allow pre-lobby.

            // Actually, standard practice: Instructions visible, Start button disabled.
            // We pass the error info to frontend.
            return Response.json(
                {
                    error: error.message,
                    exam: {
                        title: exam.title,
                        scheduledAt: exam.scheduledAt,
                        duration: exam.duration
                    }
                },
                { status: 403 }
            );
        }

        // Check existing submission & attempts
        const submissions = await ExamSubmission.find({
            exam: examId,
            student: session.user.id
        }).sort({ createdAt: -1 });

        const inProgress = submissions.find(s => s.status === 'in_progress');
        const consumedAttempts = submissions.filter(s => ['submitted', 'evaluated'].includes(s.status)).length;
        const maxAttempts = exam.maxAttempts || 1;

        // If something is in progress, we are good (resumable)
        if (inProgress) {
            // Already handled by existingSubmission logic below
        } else if (maxAttempts > 0 && consumedAttempts >= maxAttempts) {
            // No in-progress session AND attempts exhausted -> Redirect to result
            return Response.json(
                { error: 'All attempts used', submissionId: submissions[0]?._id },
                { status: 409 }
            );
        }

        // Return exam instructions
        return Response.json({
            exam: {
                id: exam._id,
                title: exam.title,
                duration: exam.duration,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                questionCount: exam.questions.length,
                description: exam.description || exam.instructions,
                securityConfig: exam.securityConfig,
                scheduledAt: exam.scheduledAt,
                maxAttempts: exam.maxAttempts
            },
            canResume: !!inProgress,
            submissionId: inProgress?._id || null,
            startedAt: inProgress?.startedAt || null,
            attemptNumber: inProgress ? inProgress.attemptNumber : (consumedAttempts + 1)
        });

    } catch (error) {
        console.error('Error fetching instructions:', error);
        return Response.json(
            { error: error.message || 'Failed to fetch instructions' },
            { status: error.message?.includes('not enrolled') ? 403 : 500 }
        );
    }
}
