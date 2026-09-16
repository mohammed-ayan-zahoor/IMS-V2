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
                    select: 'text type options correctAnswer marks modelAnswer rubric explanation snippet questionImage'
                }
            })
            .populate('student'); // Populate all student fields including virtuals like fullName

        if (!submission) {
            return Response.json({ error: 'Submission not found' }, { status: 404 });
        }

        const exam = submission.exam;
        const questions = exam?.questions || [];

        // Process questions to include correctness/feedback
        const processedAnswers = submission.answers.map(ans => {
            const question = questions.find(q => q._id.toString() === ans.questionId.toString());
            const maxMarks = question?.marks || 0;
            const marksAwarded = ans.marksAwarded ?? 0;
            const isFull = ans.isCorrect || (marksAwarded >= maxMarks && maxMarks > 0);

            let result = {
                questionId: ans.questionId,
                questionText: question?.text || 'Deleted question',
                type: question?.type || null,
                yourAnswer: ans.answer,
                marksAwarded: marksAwarded,
                maxMarks: maxMarks,
                isCorrect: isFull,
                feedback: ans.feedback || '',
                needsGrading: ans.needsGrading || false,
                snippet: question?.snippet || null,
                questionImage: question?.questionImage || null
            };

            // Always show correct answers & explanations to admins (regardless of exam settings)
            if (question) {
                result.correctAnswer = question.correctAnswer || null;
                result.options = question.options || [];
                result.modelAnswer = question.modelAnswer || null;
                result.rubric = question.rubric || null;
                result.explanation = question.explanation || null;
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
                title: exam?.title || 'Unknown Exam',
                totalMarks: exam?.totalMarks ?? 0,
                passingMarks: exam?.passingMarks ?? 0
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
