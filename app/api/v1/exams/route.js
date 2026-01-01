import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";
import "@/models/Course";
import "@/models/Batch";
import AuditLog from "@/models/AuditLog";
import { getClientIp } from "@/lib/ip-helper";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const status = searchParams.get("status");

        const query = { deletedAt: null };
        if (courseId) query.course = courseId;
        if (status) query.status = status;

        const exams = await Exam.find(query)
            .populate("course", "name code")
            .populate("batches", "name")
            .sort({ createdAt: -1 });

        return NextResponse.json({ exams });

    } catch (error) {
        console.error("Fetch Exams Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const exam = await Exam.create({
            ...body,
            createdBy: session.user.id
        });

        // Audit Log
        try {
            const ipAddress = getClientIp(req);

            await AuditLog.create({
                actor: session.user.id,
                action: 'exam.create',
                resource: { type: 'Exam', id: exam._id },
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
