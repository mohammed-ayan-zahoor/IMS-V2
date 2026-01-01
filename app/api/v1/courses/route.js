import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const courses = await CourseService.getCourses({}, scope.instituteId);
        return NextResponse.json({ courses });
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
