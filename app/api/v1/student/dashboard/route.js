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
            "enrolledStudents.student": studentId,
            "enrolledStudents.status": "active",
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

        // 2. Attendance Stats
        // Find total days vs present days in user's batches
        // Keep it simple: Find all attendance records where this student is marked present
        // Total possible attendance is harder without master schedule, 
        // so we'll approximate: All attendance records created for my batches

        // This is expensive: Find all attendance docs for my batches
        // Optimized: Just count docs
        const totalAttendanceSessions = await Attendance.countDocuments({
            batch: { $in: batchIds },
            date: { $lte: new Date() },
            status: 'completed'
        });

        // Find how many I was present in
        // record.records { student: ID, status: 'present' }
        const presentCount = await Attendance.countDocuments({
            batch: { $in: batchIds },
            status: 'completed',
            records: {
                $elemMatch: { student: studentId, status: 'present' }
            }
        });

        const attendancePercentage = totalAttendanceSessions > 0
            ? Math.round((presentCount / totalAttendanceSessions) * 100)
            : 0;

        // 3. Exams Taken
        const examsTaken = await ExamSubmission.countDocuments({
            student: studentId,
            status: { $ne: 'in-progress' }
        });

        // 4. Upcoming Exams
        const now = new Date();
        const upcomingExams = await Exam.find({
            course: { $in: courseIds },
            deletedAt: null,
            status: 'published',
            // Exam not taken yet? Too complex query, just show available future exams
            scheduledAt: { $gt: now }
        })
            .sort({ scheduledAt: 1 })
            .limit(2)
            .select('title scheduledAt duration passingMarks');

        // 5. Recent Materials
        const recentMaterials = await Material.find({
            deletedAt: null,
            visibleToStudents: true,
            course: { $in: courseIds },
            $or: [
                { batches: { $in: batchIds } },
                { batches: { $size: 0 } },
                { batches: { $exists: false } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('course', 'name');

        // 6. Total Materials
        // Reuse query logic
        const materialsCount = await Material.countDocuments({
            deletedAt: null,
            visibleToStudents: true,
            course: { $in: courseIds },
            $or: [
                { batches: { $in: batchIds } },
                { batches: { $size: 0 } },
                { batches: { $exists: false } }
            ]
        });


        return NextResponse.json({
            attendance: attendancePercentage,
            examsTaken,
            materialsCount,
            upcomingExams,
            recentMaterials
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
