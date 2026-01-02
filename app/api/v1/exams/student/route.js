import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Batch from '@/models/Batch';
import '@/models/Course'; // Ensure Course schema is registered for population
import ExamSubmission from '@/models/ExamSubmission';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Find batches student is enrolled in
        const batches = await Batch.find({
            'enrolledStudents.student': session.user.id,
            'enrolledStudents.status': 'active',
            deletedAt: null
        }).select('_id');

        const batchIds = batches.map(b => b._id);

        // Find exams for these batches
        const exams = await Exam.find({
            batches: { $in: batchIds }, // Updated from 'batch' to 'batches' array
            status: 'published', // Updated from 'isPublished' to 'status' enum
            deletedAt: null
        })
            .populate('course') // Updated population (Exam model has `course`, not `batch` as single ref anymore)
            .populate('batches')
            .sort({ scheduledAt: -1 }); // Updated from schedule.startTime to scheduledAt

        // Get submission status for each exam
        const examsWithStatus = await Promise.all(
            exams.map(async (exam) => {
                const submissions = await ExamSubmission.find({
                    exam: exam._id,
                    student: session.user.id
                }).select('status score percentage submittedAt attemptNumber');

                const now = new Date();
                const startTime = new Date(exam.scheduledAt);

                // Effective end time
                const endTime = exam.endTime
                    ? new Date(exam.endTime)
                    : new Date(startTime.getTime() + exam.duration * 60000);

                // Analyze submissions
                const attemptsUsed = submissions.filter(s => s.status !== 'in_progress').length;
                const activeSubmission = submissions.find(s => s.status === 'in_progress');

                // Find best result
                let bestSubmission = null;
                if (submissions.length > 0) {
                    bestSubmission = submissions.reduce((prev, current) =>
                        (prev.score > current.score) ? prev : current
                    );
                }

                const maxAttempts = exam.maxAttempts || 1;
                const isUnlimited = maxAttempts === 0;

                let status = 'available';

                // 1. Check if exam window is valid
                if (now < startTime) {
                    status = 'upcoming';
                } else if (now > endTime && !activeSubmission) {
                    status = 'missed'; // Deadline passed and no active session to resume
                }
                // 2. Check Submission Status
                else if (activeSubmission) {
                    status = 'in_progress';
                } else if (!isUnlimited && attemptsUsed >= maxAttempts) {
                    status = 'submitted'; // All attempts used
                } else if (attemptsUsed > 0 && (isUnlimited || attemptsUsed < maxAttempts)) {
                    status = 'available'; // Can retake
                }

                // If 'submitted', user might want to see results.
                // If 'available' (retake), user sees 'Start/Retake'.

                return {
                    ...exam.toObject(),
                    submissionStatus: status,
                    attemptsUsed,
                    maxAttempts: isUnlimited ? 'Unlimited' : maxAttempts,
                    bestResult: bestSubmission ? {
                        score: bestSubmission.score,
                        percentage: bestSubmission.percentage,
                        status: bestSubmission.status,
                        _id: bestSubmission._id
                    } : null
                };
            })
        );

        return Response.json({ exams: examsWithStatus });

    } catch (error) {
        console.error('Error fetching student exams:', error);
        return Response.json(
            { error: 'Failed to fetch exams' },
            { status: 500 }
        );
    }
}
