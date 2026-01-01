import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Question from "@/models/Question";
import Course from "@/models/Course";
import Batch from "@/models/Batch";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const exam = await Exam.findById(id)
            .populate("course", "name code")
            .populate("batches", "name")
            .populate("questions");

        if (!exam || exam.deletedAt) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ exam });

    } catch (error) {
        console.error("Fetch Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        // Prevent deletion via PATCH
        delete body.deletedAt;
        delete body.createdBy;

        const exam = await Exam.findById(id);
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Explicitly set fields
        if (body.questions !== undefined) exam.questions = body.questions;
        if (body.title !== undefined) exam.title = body.title;
        if (body.description !== undefined) exam.description = body.description;
        if (body.status !== undefined) exam.status = body.status;
        if (body.totalMarks !== undefined) exam.totalMarks = body.totalMarks;
        if (body.resultsPublished !== undefined) exam.resultsPublished = body.resultsPublished;
        // Handle other fields if necessary
        Object.keys(body).forEach(key => {
            if (!['questions', 'title', 'description', 'status', 'totalMarks', 'resultsPublished', 'deletedAt', 'createdBy', 'course', 'batches'].includes(key)) {
                exam[key] = body[key];
            }
        });

        await exam.save();
        await exam.save();

        // Populate to match GET response structure
        await exam.populate([
            { path: "course", select: "name code" },
            { path: "batches", select: "name" },
            { path: "questions" }
        ]);

        return NextResponse.json({ success: true, exam });
    } catch (error) {
        console.error("Update Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Soft delete
        const exam = await Exam.findByIdAndUpdate(
            id,
            { deletedAt: new Date() },
            { new: true }
        );

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Exam deleted" });

    } catch (error) {
        console.error("Delete Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
