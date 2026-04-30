import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Submission from "@/models/Submission";

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

        const submission = await Submission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        // Apply grading
        submission.marksAwarded = body.marksAwarded;
        submission.feedback = body.feedback;
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
