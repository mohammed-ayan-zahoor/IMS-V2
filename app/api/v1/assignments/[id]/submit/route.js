import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Submission from "@/models/Submission";
import Batch from "@/models/Batch";

/**
 * @route   POST /api/v1/assignments/[id]/submit
 * @desc    Student uploads/submits an assignment
 */
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'student') {
            return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
        }

        await connectDB();

        // 1. Verify assignment exists and allows submissions
        const assignment = await Material.findById(id);
        if (!assignment || assignment.category !== 'assignment' || !assignment.allowSubmissions) {
            return NextResponse.json({ error: "Assignment not found or submissions are disabled" }, { status: 404 });
        }

        // 2. Verify student is enrolled in the course/batch for this assignment
        // We check if the student is in any of the batches linked to the assignment, 
        // OR if the assignment is course-wide and the student is in a batch of that course.
        const enrollment = await Batch.findOne({
            $or: [
                { _id: { $in: assignment.batches } },
                { course: { $in: assignment.courses } }
            ],
            "enrolledStudents": {
                $elemMatch: {
                    student: session.user.id,
                    status: "active"
                }
            }
        });

        if (!enrollment) {
            return NextResponse.json({ error: "Access denied: Not enrolled in the required course/batch" }, { status: 403 });
        }

        const body = await req.json();
        if (!body.file?.url) {
            return NextResponse.json({ error: "File submission is required" }, { status: 400 });
        }

        // 3. Create or Update submission (Allowing students to overwrite their submission before grading)
        const submission = await Submission.findOneAndUpdate(
            { assignment: id, student: session.user.id },
            {
                assignment: id,
                student: session.user.id,
                file: {
                    url: body.file.url,
                    publicId: body.file.publicId,
                    originalName: body.file.originalName,
                    size: body.file.size
                },
                submittedAt: new Date(),
                status: 'pending',
                // Set expiry (TTL) - e.g. 1 year from now for academic records
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
            },
            { upsert: true, new: true, runValidators: true }
        );

        return NextResponse.json({ 
            success: true, 
            message: "Assignment submitted successfully",
            submission 
        });

    } catch (error) {
        console.error("Assignment Submission API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @route   GET /api/v1/assignments/[id]/submit
 * @desc    Get student's own submission for an assignment
 */
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const submission = await Submission.findOne({ 
            assignment: id, 
            student: session.user.id 
        }).populate('gradedBy', 'profile.firstName profile.lastName');

        return NextResponse.json({ submission });
    } catch (error) {
        console.error("Fetch Own Submission Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
