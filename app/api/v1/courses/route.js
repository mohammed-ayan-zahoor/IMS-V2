import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get('instituteId');

        // Global View Logic: 
        // 1. Super Admin + (instituteId='all' OR no instituteId provided)
        const isGlobalView = scope.isSuperAdmin && (!targetInstParam || targetInstParam === "all");
        const instituteId = isGlobalView ? null : (targetInstParam || scope.instituteId);

        const courses = await CourseService.getCourses({}, instituteId);
        return NextResponse.json({ courses });
    } catch (error) {
        console.error("API Error [Courses GET]:", error);
        return NextResponse.json({ 
            error: "Internal Server Error",
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
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
        if (!body.name || !body.code) {
            return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
        }

        const courseData = { ...body, institute: scope.instituteId };
        const course = await CourseService.createCourse(courseData, session.user.id);
        return NextResponse.json(course, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
