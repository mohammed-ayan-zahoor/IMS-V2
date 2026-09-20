import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";

/**
 * @route   PATCH /api/v1/submissions/[id]/grade
 * @desc    Instructor grades a student submission
 */
export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const submission = await Submission.findById(id).populate('assignment');
        if (!submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        // Institute boundary check
        if (session.user.role !== 'super_admin' && submission.assignment?.institute && String(submission.assignment.institute) !== String(session.user.institute?.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const marks = Number(body.marksAwarded);
        if (isNaN(marks) || marks < 0) {
            return NextResponse.json({ error: "Invalid marks: must be 0 or greater" }, { status: 400 });
        }

        if (submission.assignment?.totalMarks != null && marks > submission.assignment.totalMarks) {
            return NextResponse.json({ error: `Marks cannot exceed total marks (${submission.assignment.totalMarks})` }, { status: 400 });
        }

        // Apply grading
        submission.marksAwarded = marks;
        submission.feedback = body.feedback || "";
        submission.status = 'graded';
        submission.gradedBy = session.user.id;
        submission.gradedAt = new Date();

        await submission.save();

        return NextResponse.json({ 
            success: true, 
            message: "Submission graded successfully",
            submission 
        });

    } catch (error) {
        console.error("Grading API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
