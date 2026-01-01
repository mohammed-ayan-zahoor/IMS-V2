import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Question from "@/models/Question";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !["admin", "super_admin", "instructor", "student"].includes(scope.user.role)) {
            // Students take exams too, so they need read access!
            // Check role permissions logic more deeply later, for now allow student
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const exam = await Exam.findById(id)
            .populate("course", "name code")
            .populate("batches", "name")
            .populate("questions");

        if (!exam || exam.deletedAt) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Scope Check
        const hasAccess = await validateInstituteAccess(exam, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized access to this resource" }, { status: 403 });
        }

        return NextResponse.json({ exam });

    } catch (error) {
        console.error("Fetch Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions); // Need full session for audit log? scope has user too.
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        // Prevent deletion via PATCH
        delete body.deletedAt;
        delete body.createdBy;
        delete body.institute; // Cannot move exam to another institute via PATCH

        // Fetch Exam first
        const exam = await Exam.findById(id);
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Scope Check
        const hasAccess = await validateInstituteAccess(exam, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized access to this resource" }, { status: 403 });
        }

        // --- UPDATE LOGIC ---
        // 1. Direct Field Updates
        if (body.questions !== undefined) exam.questions = body.questions;
        if (body.title !== undefined) exam.title = body.title;
        if (body.description !== undefined) exam.description = body.description;
        if (body.totalMarks !== undefined) exam.totalMarks = body.totalMarks;
        if (body.course !== undefined) exam.course = body.course;
        if (body.batches !== undefined) exam.batches = body.batches;
        if (body.duration !== undefined) exam.duration = body.duration;

        // Update schedule first (if provided)
        if (body.schedule !== undefined) {
            // Validate schedule times
            const startTime = body.schedule.startTime ? new Date(body.schedule.startTime) : exam.schedule?.startTime;
            const endTime = body.schedule.endTime ? new Date(body.schedule.endTime) : exam.schedule?.endTime;
            if (startTime && endTime && startTime >= endTime) {
                return NextResponse.json({ error: "Schedule start time must be before end time" }, { status: 400 });
            }
            exam.schedule = body.schedule;
        }

        // 2. Auto-update status based on schedule (only if status is NOT explicitly set in body)
        if (body.status === undefined && exam.status === 'published' && exam.schedule?.startTime && exam.schedule?.endTime) {
            const now = new Date();
            const startTime = new Date(exam.schedule.startTime);
            const endTime = new Date(exam.schedule.endTime);

            if (now >= startTime && now <= endTime) {
                exam.status = 'ongoing';
            } else if (now > endTime) {
                exam.status = 'completed';
            }
        }

        // Now apply explicit status if provided
        if (body.status !== undefined) exam.status = body.status;

        if (body.resultsPublished !== undefined) {
            exam.resultsPublished = body.resultsPublished;
            if (body.resultsPublished && !exam.resultsPublishedAt) {
                exam.resultsPublishedAt = new Date();
            }
        }

        // 3. Handle nested Security or Grading configs if passed partially
        if (body.securityConfig) {
            exam.securityConfig = {
                ...(exam.securityConfig?.toObject ? exam.securityConfig.toObject() : exam.securityConfig || {}),
                ...body.securityConfig
            };
        } if (body.negativeMarking !== undefined) exam.negativeMarking = body.negativeMarking;
        if (body.negativeMarkingPercentage !== undefined) exam.negativeMarkingPercentage = body.negativeMarkingPercentage;
        if (body.passingMarks !== undefined) exam.passingMarks = body.passingMarks;
        if (body.instructions !== undefined) exam.instructions = body.instructions;


        await exam.save();

        // Populate
        await exam.populate([
            { path: "course", select: "name code" },
            { path: "batches", select: "name" },
            { path: "questions" } // Populate ref questions
        ]);

        return NextResponse.json({ success: true, exam });
    } catch (error) {
        console.error("Update Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch first to validate scope
        const exam = await Exam.findById(id);
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Scope Check
        const hasAccess = await validateInstituteAccess(exam, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized access to this resource" }, { status: 403 });
        }

        // Soft delete
        exam.deletedAt = new Date();
        await exam.save();

        return NextResponse.json({ success: true, message: "Exam deleted" });

    } catch (error) {
        console.error("Delete Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
