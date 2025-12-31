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

        // Check existing submission
        const existingSubmission = await ExamSecurityService.checkExistingSubmission(
            examId,
            session.user.id
        );

        if (existingSubmission && existingSubmission.status === 'submitted') {
            return Response.json(
                { error: 'Already submitted', submissionId: existingSubmission._id },
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
                description: exam.description, // Updated from instructions to description
                securityConfig: exam.securityConfig,
                scheduledAt: exam.scheduledAt
            },
            canResume: existingSubmission ? true : false,
            submissionId: existingSubmission?._id
        });

    } catch (error) {
        console.error('Error fetching instructions:', error);
        return Response.json(
            { error: error.message || 'Failed to fetch instructions' },
            { status: error.message.includes('not enrolled') ? 403 : 500 }
        );
    }
}
