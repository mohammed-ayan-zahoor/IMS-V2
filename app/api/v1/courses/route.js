// C:\Users\Charge-entry18\Desktop\Projects\ims-v2\app\api\v1\courses\route.js
import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const courses = await CourseService.getCourses();
    return NextResponse.json(courses);
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const course = await CourseService.createCourse(body, session.user.id);
    return NextResponse.json(course, { status: 201 });
}
