import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Batch from '@/models/Batch';
import '@/models/Course'; // Ensure Course schema is registered for population
import ExamSubmission from '@/models/ExamSubmission';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // 1. Find batches student is enrolled in
        const batches = await Batch.find({
            'enrolledStudents.student': session.user.id,
            'enrolledStudents.status': 'active',
            deletedAt: null
        }).select('_id');

        const batchIds = batches.map(b => b._id);

        // 2. Find exams for these batches
        const exams = await Exam.find({
            batches: { $in: batchIds },
            status: 'published',
            deletedAt: null
        })
            .populate('course')
            .populate('batches')
            .sort({ scheduledAt: -1 })
            .lean();

        // 3. Batch Fetch Submissions (N+1 Optimization)
        const examIds = exams.map(e => e._id);
        const allSubmissions = await ExamSubmission.find({
            student: session.user.id,
            exam: { $in: examIds }
        }).select('status score percentage submittedAt attemptNumber exam').lean();

        // Group submissions by exam ID for O(1) lookup
        const submissionsByExam = allSubmissions.reduce((acc, sub) => {
            const examId = sub.exam.toString();
            if (!acc[examId]) acc[examId] = [];
            acc[examId].push(sub);
            return acc;
        }, {});

        // 4. Process exams
        const examsWithStatus = exams.map((exam) => {
            const submissions = submissionsByExam[exam._id.toString()] || [];

            const now = new Date();
            // Use schedule.startTime if available, else legacy scheduledAt
            const startTime = (exam.schedule && exam.schedule.startTime)
                ? new Date(exam.schedule.startTime)
                : new Date(exam.scheduledAt);

            // Effective end time (Fix for Bug #3 and user-reported issue)
            const endTime = (exam.schedule && exam.schedule.endTime)
                ? new Date(exam.schedule.endTime)
                : new Date(startTime.getTime() + exam.duration * 60000);

            // Analyze submissions
            const activeSubmission = submissions.find(s => s.status === 'in_progress');
            const attemptsUsed = submissions.filter(s => s.status !== 'in_progress').length;

            // Find best and latest result (Fix for Bug #2)
            const completedSubmissions = submissions
                .filter(s => s.status !== 'in_progress' && s.submittedAt && s.score !== undefined);

            // Sort by submittedAt descending
            completedSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            const latestSubmission = completedSubmissions[0] || null;

            const bestSubmission = completedSubmissions.length > 0
                ? completedSubmissions.reduce((prev, current) => (prev.score > current.score) ? prev : current)
                : null;

            // Validating Max Attempts (Fix for Bug #1)
            const rawMaxAttempts = Number(exam.maxAttempts);
            // If NaN, default to 1. If 0, it means unlimited.
            const maxAttempts = Number.isNaN(rawMaxAttempts) ? 1 : rawMaxAttempts;
            const isUnlimited = maxAttempts === 0;

            let status = 'available';

            if (activeSubmission) {
                status = 'in_progress';
            } else if (!isUnlimited && attemptsUsed >= maxAttempts) {
                status = 'submitted'; // All attempts exhausted
            } else {
                // Eligibility exists, check time window
                if (now < startTime) {
                    status = 'upcoming';
                } else if (now > endTime) {
                    // If attempts were made, it's submitted/done. If 0 attempts and valid time passed, it's missed.
                    status = attemptsUsed > 0 ? 'submitted' : 'missed';
                } else {
                    status = 'available';
                }
            }

            return {
                ...exam,
                submissionStatus: status,
                attemptsUsed,
                maxAttempts: isUnlimited ? 'Unlimited' : maxAttempts,
                bestResult: bestSubmission ? {
                    score: bestSubmission.score,
                    percentage: bestSubmission.percentage,
                    status: bestSubmission.status,
                    _id: bestSubmission._id
                } : null,
                submission: latestSubmission ? {
                    _id: latestSubmission._id,
                    status: latestSubmission.status,
                    score: latestSubmission.score
                } : null
            };
        });

        return Response.json({ exams: examsWithStatus });

    } catch (error) {
        console.error('Error fetching student exams:', error);
        return Response.json(
            { error: 'Failed to fetch exams' },
            { status: 500 }
        );
    }
}
