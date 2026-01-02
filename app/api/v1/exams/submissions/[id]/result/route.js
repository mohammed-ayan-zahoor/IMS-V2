import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ExamSubmission from '@/models/ExamSubmission';
import '@/models/Question'; // Ensure Question schema is registered for population

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        await connectDB();

        const { id: queryId } = await params;

        // Try to find by Submission ID first
        let submission = await ExamSubmission.findOne({
            _id: queryId,
            student: session.user.id
        }).populate({
            path: 'exam',
            select: 'title totalMarks passingMarks questions resultPublication schedule showCorrectAnswers showExplanations',
            populate: {
                path: 'questions',
                model: 'Question',
                select: 'text type options correctOption marks'
            }
        });

        // If not found, try to find by Exam ID (Best Score Strategy)
        if (!submission) {
            const submissions = await ExamSubmission.find({
                exam: queryId,
                student: session.user.id
            })
                .sort({ score: -1 }) // Best score first
                .populate({
                    path: 'exam',
                    select: 'title totalMarks passingMarks questions resultPublication schedule showCorrectAnswers showExplanations',
                    populate: {
                        path: 'questions',
                        model: 'Question',
                        select: 'text type options correctOption marks'
                    }
                });

            if (submissions.length > 0) {
                submission = submissions[0];
            }
        }

        if (!submission) {
            return Response.json({ error: 'Submission not found' }, { status: 404 });
        }

        const exam = submission.exam;

        // Check Result Visibility
        let showResults = false;
        if (exam.resultPublication === 'immediate') {
            showResults = true;
        } else if (exam.resultPublication === 'after_exam_end') {
            const endTime = new Date(exam.schedule.endTime);
            if (new Date() > endTime) {
                showResults = true;
            }
        } else if (exam.resultsPublished) { // Legacy manual override
            showResults = true;
        }

        if (!showResults) {
            return Response.json({
                submission: {
                    status: submission.status,
                    submittedAt: submission.submittedAt,
                    message: `Results will be published after the exam ends on ${new Date(exam.schedule.endTime).toLocaleString()}.`
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
