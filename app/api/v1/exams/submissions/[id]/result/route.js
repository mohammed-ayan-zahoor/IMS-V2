import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ExamSubmission from '@/models/ExamSubmission';

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        await connectDB();

        const { id: queryId } = await params;

        const submission = await ExamSubmission.findOne({
            $or: [
                { _id: queryId },
                { exam: queryId }
            ],
            student: session.user.id
        }).populate({
            path: 'exam',
            select: 'title totalMarks passingMarks questions resultsPublished showCorrectAnswers showExplanations',
            populate: {
                path: 'questions',
                model: 'Question',
                select: 'text type options correctOption marks'
            }
        });

        if (!submission) {
            return Response.json({ error: 'Submission not found' }, { status: 404 });
        }

        const exam = submission.exam;

        // Gatekeeping Results
        if (!exam.resultsPublished) {
            return Response.json({
                submission: {
                    status: submission.status,
                    submittedAt: submission.submittedAt,
                    message: "Results have not been published yet."
                },
                exam: {
                    title: exam.title
                }
            });
        }

        // Process questions to include correctness/feedback based on config
        const processedAnswers = submission.answers.map(ans => {
            const question = exam.questions.find(q => q._id.toString() === ans.questionId.toString());

            let result = {
                questionId: ans.questionId,
                questionText: question?.text,
                type: question?.type,
                yourAnswer: ans.answer,
                marksAwarded: ans.marksAwarded,
                maxMarks: question?.marks,
                isCorrect: ans.isCorrect
            };

            if (exam.showCorrectAnswers) {
                result.correctAnswer = question?.correctOption; // Or text for descriptive
                result.options = question?.options;
            }

            return result;
        });

        return Response.json({
            submission: {
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
            }
        });

    } catch (error) {
        console.error('Error fetching results:', error);
        return Response.json({ error: 'Failed to fetch results' }, { status: 500 });
    }
}
