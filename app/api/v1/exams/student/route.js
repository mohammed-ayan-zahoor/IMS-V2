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
                let latestSubmission = null;

                if (submissions.length > 0) {
                    // Filter to completed submissions and sort by submission time (descending)
                    const completedSubmissions = submissions
                        .filter(s => s.status !== 'in_progress' && s.submittedAt)
                        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                    latestSubmission = completedSubmissions[0] || null; bestSubmission = submissions.reduce((prev, current) =>
                        (prev.score > current.score) ? prev : current
                    );
                }

                const rawMaxAttempts = Number(exam.maxAttempts);
                // Default to 1 only if truly invalid or missing. If 0 (unlimited), keep 0.
                // If it is 0, we treat as unlimited.
                const maxAttempts = (rawMaxAttempts === 0 || !Number.isNaN(rawMaxAttempts)) ? rawMaxAttempts : 1;
                const isUnlimited = maxAttempts === 0;

                let status = 'available';
                // 2. Check Submission Status
                if (activeSubmission) {
                    status = 'in_progress';
                } else if (!isUnlimited && attemptsUsed >= maxAttempts) {
                    status = 'submitted'; // All attempts used
                } else {
                    // Eligibility exists (either first time or retake), check window
                    if (now < startTime) {
                        status = 'upcoming';
                    } else if (now > endTime) {
                        status = attemptsUsed > 0 ? 'submitted' : 'missed';
                    } else {
                        status = 'available'; // Within window and attempts remain
                    }
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
                    } : null,
                    // Frontend expects 'submission' for ID. sending best or latest?
                    // Usually "View Result" should show the most relevant one. 
                    // Let's send the latest one so they see what they just did.
                    submission: latestSubmission ? {
                        _id: latestSubmission._id,
                        status: latestSubmission.status,
                        score: latestSubmission.score
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
