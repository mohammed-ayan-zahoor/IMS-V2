// C:\Users\Charge-entry18\Desktop\Projects\ims-v2\app\api\v1\batches\route.js
import { NextResponse } from "next/server";
import { BatchService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');
        const sessionId = searchParams.get('sessionId');
        const targetInstParam = searchParams.get('instituteId');
        const enrolledStudents = searchParams.get('enrolledStudents');

        const filters = {};
        if (courseId) filters.course = courseId;
        if (sessionId) filters.session = sessionId;
        if (enrolledStudents) filters.enrolledStudents = enrolledStudents;

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        // Apply Instructor isolation
        if (scope.user.role === 'instructor') {
            filters.instructorRoleContext = scope.user.id;
        }

        // Global View Logic: 
        // 1. Super Admin + (instituteId='all' OR no instituteId provided)
        const isGlobalView = scope.isSuperAdmin && (!targetInstParam || targetInstParam === "all");

        let instituteId;
        if (isGlobalView) {
            instituteId = null;
        } else if (scope.isSuperAdmin && targetInstParam) {
            // Super admin filtering by specific institute
            instituteId = targetInstParam;
        } else {
            // Non-super-admins are restricted to their own institute
            instituteId = scope.instituteId;
        }
        const batches = await BatchService.getBatches(filters, instituteId);
        return NextResponse.json({ batches });
    } catch (error) {
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
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        if (!body.name || !body.course) {
            return NextResponse.json({ error: "Name and course reference are required" }, { status: 400 });
        }

        // Determine target institute
        let targetInstitute = scope.instituteId;
        if (scope.isSuperAdmin && !targetInstitute) {
            targetInstitute = body.institute;
        }

        if (!targetInstitute) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        const batch = await BatchService.createBatch({ ...body, institute: targetInstitute }, session.user.id);
        return NextResponse.json(batch, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/batches error:", error);
        const clientMessage = error.name === 'ValidationError'
            ? error.message
            : "Failed to create batch";
        return NextResponse.json({ error: clientMessage }, { status: 400 });
    }
}
