import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import Course from "@/models/Course";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We can't use CourseService.getCourses easily for single ID without refactor,
        // so we use direct findOne with strict scope here or add getCourseById to service.
        // For consistency, let's use direct query matching service pattern logic.

        const query = { _id: id, deletedAt: null };
        if (scope.instituteId) query.institute = scope.instituteId;

        const course = await Course.findOne(query).populate('createdBy', 'profile.firstName profile.lastName');

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json(course);
    } catch (error) {
        console.error("Course GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        const updatedCourse = await CourseService.updateCourse(id, body, session.user.id, scope.instituteId);

        return NextResponse.json(updatedCourse);
    } catch (error) {
        console.error("Course Update Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update course" }, { status: 400 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        await CourseService.deleteCourse(id, session.user.id, scope.instituteId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Course Delete Error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete course" }, { status: 400 });
    }
}
