import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ExamSubmission from '@/models/ExamSubmission';
import '@/models/Question'; // Ensure Question schema is registered for population

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        // Authorization: Only admins, super_admins, and instructors can access
        if (!session?.user || !['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id: submissionId } = await params;

        // Fetch submission with populated exam and questions
        const submission = await ExamSubmission.findById(submissionId)
            .populate({
                path: 'exam',
                select: 'title totalMarks passingMarks questions showCorrectAnswers showExplanations',
                populate: {
                    path: 'questions',
                    model: 'Question',
                    select: 'text type options correctAnswer marks'
                }
            })
            .populate('student'); // Populate all student fields including virtuals like fullName

        if (!submission) {
            return Response.json({ error: 'Submission not found' }, { status: 404 });
        }

        const exam = submission.exam;

        // Process questions to include correctness/feedback
        const exam = submission.exam;
        const questions = exam?.questions || [];

        // Process questions to include correctness/feedback
        const processedAnswers = submission.answers.map(ans => {
            const question = questions.find(q => q._id.toString() === ans.questionId.toString());
            let result = {
                questionId: ans.questionId,
                questionText: question?.text || 'Deleted question',
                type: question?.type || null,
                yourAnswer: ans.answer,
                marksAwarded: ans.marksAwarded,
                maxMarks: question?.marks || 0,
                isCorrect: ans.isCorrect || false
            };

            // Always show correct answers to admins (regardless of exam settings)
            if (question) {
                result.correctAnswer = question.correctAnswer || null;
                result.options = question.options || [];
            }

            return result;
        });

        return Response.json({
            submission: {
                _id: submission._id,
                score: submission.score,
                percentage: submission.percentage,
                status: submission.status,
                submittedAt: submission.submittedAt,
                answers: processedAnswers,
                remarks: submission.remarks
            },
            exam: {
                title: exam.title,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks
            },
            student: {
                fullName: submission.student?.fullName,
                email: submission.student?.email,
                enrollmentNumber: submission.student?.enrollmentNumber
            }
        });

    } catch (error) {
        console.error('Error fetching admin results:', error);
        return Response.json({ error: 'Failed to fetch results' }, { status: 500 });
    }
}
