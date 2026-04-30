import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Batch from "@/models/Batch";
import Submission from "@/models/Submission";

/**
 * @route   GET /api/v1/student/assignments/calendar
 * @desc    Get all relevant assignments with submission status for calendar view
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Find Student's Batches & Courses (Same logic as materials API)
        const studentBatches = await Batch.find({
            "enrolledStudents": {
                $elemMatch: {
                    student: session.user.id,
                    status: "active"
                }
            },
            deletedAt: null
        }).select("course _id");

        const enrolledCourseIds = studentBatches.map(b => b.course);
        const enrolledBatchIds = studentBatches.map(b => b._id.toString());

        if (studentBatches.length === 0) {
            return NextResponse.json({ assignments: [] });
        }

        // 2. Fetch Assignments
        const query = {
            deletedAt: null,
            visibleToStudents: true,
            category: "assignment",
            course: { $in: enrolledCourseIds },
            $or: [
                { batches: { $in: enrolledBatchIds } },
                { batches: { $size: 0 } },
                { batches: { $exists: false } }
            ]
        };

        const assignments = await Material.find(query)
            .populate("course", "name")
            .select("title description dueDate totalMarks course category allowSubmissions")
            .sort({ dueDate: 1 });

        // 3. Fetch Student Submissions to mark status
        const assignmentIds = assignments.map(a => a._id);
        const submissions = await Submission.find({
            assignment: { $in: assignmentIds },
            student: session.user.id
        }).select("assignment status submittedAt marksAwarded");

        // 4. Map together
        const calendarEvents = assignments.map(assignment => {
            const submission = submissions.find(s => s.assignment.toString() === assignment._id.toString());
            
            return {
                id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                dueDate: assignment.dueDate,
                totalMarks: assignment.totalMarks,
                course: assignment.course?.name || "General",
                allowSubmissions: assignment.allowSubmissions,
                submissionStatus: submission ? (submission.status === 'graded' ? 'Graded' : 'Submitted') : 'Not Submitted',
                submittedAt: submission?.submittedAt || null,
                marksAwarded: submission?.marksAwarded || null
            };
        });

        return NextResponse.json({ assignments: calendarEvents });

    } catch (error) {
        console.error("Assignment Calendar API Error:", error);
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }
}
