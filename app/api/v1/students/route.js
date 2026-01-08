import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 10));
        const search = searchParams.get("search") || "";
        const showDeleted = searchParams.get("showDeleted") === "true";
        const batchId = searchParams.get("batchId");
        const courseId = searchParams.get("courseId");
        const isActive = searchParams.get("isActive");

        const data = await StudentService.getStudents({
            page,
            limit,
            search,
            showDeleted,
            batchId,
            courseId,
            isActive,
            instituteId: scope.isSuperAdmin ? (searchParams.get("institute") || null) : scope.instituteId
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error [Students GET]:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Basic validation check
        if (!body.email || !body.profile?.firstName || !body.profile?.lastName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Super admins must explicitly specify target institute via query param or validated field
        let targetInstituteId;
        if (scope.isSuperAdmin) {
            // Require explicit institute specification for super admins
            targetInstituteId = body.institute;
            if (!targetInstituteId) {
                return NextResponse.json({ error: "Super admins must specify target institute" }, { status: 400 });
            }
            // TODO: Add validation that the institute exists and super admin has access
        } else {
            targetInstituteId = scope.instituteId;
        }

        const studentData = {
            ...body,
            institute: targetInstituteId
        };

        const student = await StudentService.createStudent(studentData, session.user.id);

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error("API Error [Students POST]:", error);
        const message = error.message || "Failed to create student";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
