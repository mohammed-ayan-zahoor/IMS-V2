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

/**
 * @route   PATCH /api/v1/assignments/[id]/submissions
 * @desc    Instructor bulk-grades submissions for an assignment
 */
export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const assignment = await Material.findById(id);
        if (!assignment) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        if (session.user.role !== 'super_admin' && String(assignment.institute) !== String(session.user.institute?.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { grades } = body;

        if (!Array.isArray(grades) || grades.length === 0) {
            return NextResponse.json({ error: "grades array is required and cannot be empty" }, { status: 400 });
        }

        // Validate all grades before executing bulk write
        const now = new Date();
        const bulkOps = [];

        for (const g of grades) {
            if (!g.submissionId) continue;
            const marks = Number(g.marksAwarded);
            if (isNaN(marks) || marks < 0) {
                return NextResponse.json({ error: `Invalid marks for submission ${g.submissionId}: must be >= 0` }, { status: 400 });
            }
            if (assignment.totalMarks != null && marks > assignment.totalMarks) {
                return NextResponse.json({ error: `Marks for submission ${g.submissionId} exceed total marks (${assignment.totalMarks})` }, { status: 400 });
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: g.submissionId, assignment: id },
                    update: {
                        $set: {
                            marksAwarded: marks,
                            feedback: g.feedback || "",
                            status: 'graded',
                            gradedBy: session.user.id,
                            gradedAt: now
                        }
                    }
                }
            });
        }

        if (bulkOps.length === 0) {
            return NextResponse.json({ error: "No valid submissions provided" }, { status: 400 });
        }

        const result = await Submission.bulkWrite(bulkOps);

        return NextResponse.json({
            success: true,
            message: `Successfully graded ${result.modifiedCount} submission(s)`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Bulk Grading API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

