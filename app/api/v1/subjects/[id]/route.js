import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { SubjectService } from "@/services/subjectService";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        const subject = await SubjectService.getSubjectById(id, scope?.instituteId);
        if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        return NextResponse.json({ subject });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PATCH(req, { params }) {

    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const scope = await getInstituteScope(req);
        const body = await req.json();

        const subject = await SubjectService.updateSubject(id, body, session.user.id, scope, req);
        return NextResponse.json({ subject });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Subject code already exists" }, { status: 400 });
        }
        const status = error.message === "Subject not found" ? 404
            : error.message === "Unauthorized" ? 403 : 500;
        console.error("Update Subject Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const scope = await getInstituteScope(req);

        await SubjectService.deleteSubject(id, session.user.id, scope, req);
        return NextResponse.json({ success: true, message: "Subject deleted" });
    } catch (error) {
        const status = error.message === "Subject not found" ? 404
            : error.message === "Unauthorized" ? 403 : 500;
        console.error("Delete Subject Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status });
    }
}
