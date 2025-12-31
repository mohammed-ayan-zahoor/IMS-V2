import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { ExamSecurityService } from '@/services/examSecurityService';
import ExamSubmission from '@/models/ExamSubmission';
import { headers } from 'next/headers';

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        await connectDB();

        const { id: examId } = await params;
        const body = await req.json();
        const { sessionId } = body; // Browser fingerprint

        // Security validations
        const { exam } = await ExamSecurityService.validateExamAccess(
            examId,
            session.user.id
        );

        ExamSecurityService.validateExamTiming(exam);

        // Check for multiple sessions
        await ExamSecurityService.validateSingleSession(
            examId,
            session.user.id,
            sessionId
        );

        // Check existing submission
        let submission = await ExamSubmission.findOne({
            exam: examId,
            student: session.user.id
        });

        if (submission) {
            if (submission.status === 'submitted') {
                return Response.json(
                    { error: 'Already submitted' },
                    { status: 409 }
                );
            }
            // Resume existing submission
            return Response.json({
                submission: {
                    id: submission._id,
                    startedAt: submission.startedAt,
                    draftAnswers: submission.draftAnswers,
                    suspiciousEvents: submission.suspiciousEvents
                },
                isResume: true
            });
        }

        // Create new submission
        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for') ||
            headersList.get('x-real-ip') ||
            'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        submission = await ExamSubmission.create({
            exam: examId,
            student: session.user.id,
            startedAt: new Date(),
            status: 'in_progress',
            answers: exam.questions.map(q => ({
                questionId: q._id,
                answer: '',
                isCorrect: false,
                marksAwarded: 0
            })),
            draftAnswers: [],
            ipAddress,
            userAgent,
            browserFingerprint: sessionId
        });

        // Return sanitized exam (no correct answers)
        const sanitizedQuestions = exam.questions.map(q => ({
            _id: q._id,
            text: q.text, // Updated from questionText
            type: q.type,
            options: q.options,
            marks: q.marks
        }));

        return Response.json({
            submission: {
                id: submission._id,
                startedAt: submission.startedAt
            },
            exam: {
                id: exam._id,
                title: exam.title,
                duration: exam.duration,
                totalMarks: exam.totalMarks,
                questions: sanitizedQuestions,
                securityConfig: exam.securityConfig
            },
            isResume: false
        });

    } catch (error) {
        console.error('Error starting exam:', error);
        return Response.json(
            { error: error.message || 'Failed to start exam' },
            { status: 500 }
        );
    }
}
