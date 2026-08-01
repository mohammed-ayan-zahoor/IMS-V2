import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Exam from "@/models/Exam";
import Material from "@/models/Material";
import ExamSubmission from "@/models/ExamSubmission";
import Attendance from "@/models/Attendance";
import BatchSyllabusProgress from "@/models/BatchSyllabusProgress";
import Subject from "@/models/Subject";
import "@/models/Course"; // Ensure Course schema is registered

import mongoose from "mongoose";

import Session from "@/models/Session";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const studentId = session.user.id;
        const studentObjId = new mongoose.Types.ObjectId(studentId);

        // A. Get ALL enrolled batches (for overall attendance history calculation)
        const allStudentBatches = await Batch.find({
            "enrolledStudents.student": studentObjId,
            deletedAt: null
        }).select("_id");
        const allBatchIds = allStudentBatches.map(b => b._id);

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId");

        // B. Get active session for the institute
        let activeSession = null;
        if (querySessionId) {
            activeSession = { _id: new mongoose.Types.ObjectId(querySessionId) };
        } else if (session.user.institute?.id) {
            activeSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                isActive: true,
                deletedAt: null
            });
            if (!activeSession) {
                activeSession = await Session.findOne({
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).sort({ startDate: -1 });
            }
        }

        // C. Filter active student batches for the current session
        const activeBatchQuery = {
            "enrolledStudents": {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        };
        if (activeSession) {
            activeBatchQuery.session = { $in: [activeSession._id, null] };
        }

        const studentBatches = await Batch.find(activeBatchQuery).select("course _id");
        const courseIds = studentBatches.map(b => b.course);
        const batchIds = studentBatches.map(b => b._id);

        if (allBatchIds.length === 0) {
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
            status: { $in: ['evaluated', 'submitted', 'in_progress'] }
        }).select('exam');
        const submittedExamIds = submittedExams.map(s => s.exam);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 4. Run Independent Queries in Parallel
        const [
            totalAttendanceSessions,
            presentCount,
            examsTakenCount,
            upcomingExams,
            recentMaterials,
            materialsDetailsCount,
            progressRecords
        ] = await Promise.all([
            // Attendance Total - all non-holiday sessions for this student
            Attendance.countDocuments({
                batch: { $in: batchIds },
                records: {
                    $elemMatch: { student: studentObjId, status: { $ne: 'holiday' } }
                }
            }),
            // Attendance Present - all present sessions
            Attendance.countDocuments({
                batch: { $in: batchIds },
                records: {
                    $elemMatch: { student: studentObjId, status: 'present' }
                }
            }),
            // Exams Taken Count
            ExamSubmission.countDocuments({
                student: studentId,
                status: { $ne: 'in_progress' }
            }),
            // Upcoming Exams (Advanced logic: Not taken yet)
            Exam.find({
                course: { $in: courseIds },
                batches: { $in: batchIds },
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
            Material.countDocuments(materialFilter),
            // Syllabus Progress (Top 3)
            BatchSyllabusProgress.find({ batch: { $in: batchIds } })
                .populate('subject', 'name code')
                .sort({ overallProgress: -1 })
                .limit(3)
        ]);

        const syllabusProgress = progressRecords.map(r => ({
            subject: r.subject?.name,
            code: r.subject?.code,
            progress: r.overallProgress
        }));

        const attendancePercentage = totalAttendanceSessions > 0
            ? Math.min(100, Math.round((presentCount / totalAttendanceSessions) * 100))
            : 0;

        return NextResponse.json({
            attendance: attendancePercentage,
            examsTaken: examsTakenCount,
            materialsCount: materialsDetailsCount,
            upcomingExams,
            recentMaterials,
            syllabusProgress
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
