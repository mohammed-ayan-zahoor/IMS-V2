// C:\Users\Charge-entry18\Desktop\Projects\ims-v2\app\api\v1\courses\route.js
import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const courses = await CourseService.getCourses();
        return NextResponse.json(courses);
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

        const body = await req.json();
        if (!body.name || !body.code) {
            return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
        }

        const course = await CourseService.createCourse(body, session.user.id);
        return NextResponse.json(course, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
