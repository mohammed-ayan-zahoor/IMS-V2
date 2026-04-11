import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { SubjectService } from "@/services/subjectService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get('instituteId');
        const isGlobalView = scope.isSuperAdmin && (!targetInstParam || targetInstParam === "all");
        const instituteId = isGlobalView ? null : (targetInstParam || scope.instituteId);

        const subjects = await SubjectService.getSubjects(instituteId);
        return NextResponse.json({ subjects });
    } catch (error) {
        console.error("GET Subjects Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        const subject = await SubjectService.createSubject(
            { ...body, institute: scope.instituteId },
            session.user.id,
            req
        );

        return NextResponse.json({ subject }, { status: 201 });
    } catch (error) {
        console.error("Create Subject Error:", error);
        const status = error.message.includes("required") || error.message.includes("already exists") ? 400 : 500;
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status });
    }
}
