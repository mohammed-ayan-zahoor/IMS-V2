import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Exam from "@/models/Exam";
import Material from "@/models/Material";
import ExamSubmission from "@/models/ExamSubmission";
import Attendance from "@/models/Attendance";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const studentId = session.user.id;

        // 1. Get Enrolled Batches
        const studentBatches = await Batch.find({
            "enrolledStudents": {
                $elemMatch: {
                    student: studentId,
                    status: "active"
                }
            },
            deletedAt: null
        }).select("course _id");

        const courseIds = studentBatches.map(b => b.course);
        const batchIds = studentBatches.map(b => b._id);

        if (batchIds.length === 0) {
            return NextResponse.json({
                attendance: 0,
                examsTaken: 0,
                materialsCount: 0,
                upcomingExams: [],
                recentMaterials: []
            });
        }

        // 2. Prepare Filters & Variables
        const now = new Date();
        const materialFilter = {
            deletedAt: null,
            visibleToStudents: true,
            course: { $in: courseIds },
            $or: [
                { batches: { $in: batchIds } },
                { batches: { $size: 0 } },
                { batches: { $exists: false } }
            ]
        };

        // 3. fetch Exam Submissions first to exclude them from upcoming
        const submittedExams = await ExamSubmission.find({
            student: studentId,
            status: { $in: ['completed', 'submitted'] }
        }).select('exam');
        const submittedExamIds = submittedExams.map(s => s.exam);

        // 4. Run Independent Queries in Parallel
        const [
            totalAttendanceSessions,
            presentCount,
            examsTakenCount,
            upcomingExams,
            recentMaterials,
            materialsDetailsCount
        ] = await Promise.all([
            // Attendance Total
            Attendance.countDocuments({
                batch: { $in: batchIds },
                date: { $lte: now }
            }),
            // Attendance Present
            Attendance.countDocuments({
                batch: { $in: batchIds },
                records: {
                    $elemMatch: { student: studentId, status: 'present' }
                }
            }),
            // Exams Taken Count
            ExamSubmission.countDocuments({
                student: studentId,
                status: { $ne: 'in-progress' }
            }),
            // Upcoming Exams (Advanced logic: Not taken yet)
            Exam.find({
                course: { $in: courseIds },
                deletedAt: null,
                status: 'published',
                scheduledAt: { $gt: now },
                _id: { $nin: submittedExamIds }
            })
                .sort({ scheduledAt: 1 })
                .limit(2)
                .select('title scheduledAt duration passingMarks'),
            // Recent Materials
            Material.find(materialFilter)
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('course', 'name'),
            // Total Materials Count
            Material.countDocuments(materialFilter)
        ]);

        const attendancePercentage = totalAttendanceSessions > 0
            ? Math.round((presentCount / totalAttendanceSessions) * 100)
            : 0;

        return NextResponse.json({
            attendance: attendancePercentage,
            examsTaken: examsTakenCount,
            materialsCount: materialsDetailsCount,
            upcomingExams,
            recentMaterials
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
