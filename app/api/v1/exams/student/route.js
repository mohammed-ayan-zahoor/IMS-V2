import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Batch from '@/models/Batch';
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
                const submission = await ExamSubmission.findOne({
                    exam: exam._id,
                    student: session.user.id
                }).select('status score percentage submittedAt _id');

                const now = new Date();
                const startTime = new Date(exam.scheduledAt); // Ensure it's a Date object

                // Effective end time: explicit deadline OR start + duration
                const endTime = exam.endTime
                    ? new Date(exam.endTime)
                    : new Date(startTime.getTime() + exam.duration * 60000);

                let status = 'available';

                if (submission) {
                    status = submission.status;
                } else if (now < startTime) {
                    status = 'upcoming';
                } else if (now > endTime) {
                    status = 'missed';
                }

                return {
                    ...exam.toObject(),
                    submissionStatus: status,
                    submission: submission ? {
                        status: submission.status,
                        score: submission.score,
                        percentage: submission.percentage,
                        submittedAt: submission.submittedAt,
                        _id: submission._id
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
