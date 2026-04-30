import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Submission from "@/models/Submission";

/**
 * @route   GET /api/v1/assignments/[id]/submissions
 * @desc    Instructor lists all submissions for an assignment
 */
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Verify assignment exists and belongs to the user's institute if not super_admin
        const assignment = await Material.findById(id);
        if (!assignment) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        if (session.user.role !== 'super_admin' && String(assignment.institute) !== String(session.user.institute?.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const submissions = await Submission.find({ assignment: id })
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('gradedBy', 'profile.firstName profile.lastName')
            .sort({ submittedAt: -1 });

        return NextResponse.json({ 
            assignment: {
                title: assignment.title,
                totalMarks: assignment.totalMarks,
                dueDate: assignment.dueDate
            },
            submissions 
        });

    } catch (error) {
        console.error("Fetch Submissions API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
