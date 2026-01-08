import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";
import "@/models/Course";
import "@/models/Batch";
import AuditLog from "@/models/AuditLog";
import { getClientIp } from "@/lib/ip-helper";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batch"); // "batch" param from checking UI
        const status = searchParams.get("status");

        const query = { deletedAt: null };
        if (courseId) query.course = courseId;
        if (batchId) query.batches = batchId; // Autos-maps to checking existence in array
        if (status) query.status = status;

        // Apply Scope
        const scopedQuery = addInstituteFilter(query, scope);

        const exams = await Exam.find(scopedQuery)
            .populate("course", "name code")
            .populate("batches", "name")
            .sort({ createdAt: -1 });

        return NextResponse.json({ exams });

    } catch (error) {
        console.error("Fetch Exams Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();

        // Whitelist allowed fields (Mass Assignment Protection)
        // Ignoring: institute, createdBy, _id, status, deletedAt
        const allowedFields = {
            title: body.title,
            course: body.course,
            batches: body.batches || (body.batch ? [body.batch] : []), // Support both for migration
            questions: body.questions || [],
            duration: body.duration,
            totalMarks: body.totalMarks,
            passingMarks: body.passingMarks,
            scheduledAt: body.scheduledAt,
            schedule: body.schedule,
            instructions: body.instructions,
            resultsPublished: body.resultsPublished,
            resultsPublishedAt: body.resultsPublishedAt,
            showCorrectAnswers: body.showCorrectAnswers,
            showExplanations: body.showExplanations,
            securityConfig: body.securityConfig,
            negativeMarking: body.negativeMarking,
            negativeMarkingPercentage: body.negativeMarkingPercentage
        };
        const exam = await Exam.create({
            ...allowedFields,
            institute: scope.instituteId, // Set Institute
            createdBy: session.user.id
        });

        // Audit Log
        try {
            const ipAddress = getClientIp(req);

            await AuditLog.create({
                actor: session.user.id,
                action: 'exam.create',
                resource: { type: 'Exam', id: exam._id },
                institute: scope.instituteId,
                details: {
                    title: exam.title,
                    course: exam.course,
                    batches: exam.batches,
                    totalMarks: exam.totalMarks
                },
                ipAddress,
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (auditError) {
            console.error("Audit Log Error (Exam Create):", auditError);
        }

        return NextResponse.json({ success: true, exam }, { status: 201 });

    } catch (error) {
        console.error("Create Exam Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
