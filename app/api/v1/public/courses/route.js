import { NextResponse } from "next/server";
import { CourseService } from "@/services/courseService";
import { connectDB } from "@/lib/mongodb";

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ error: "Institute ID is required" }, { status: 400 });
        }

        // Fetch courses for the specific institute. 
        // CourseService.getCourses already filters for deletedAt: null.
        const allCourses = await CourseService.getCourses({}, instituteId);
        
        // Return only necessary fields for the public form
        const courses = allCourses.map(c => ({
            _id: c._id,
            name: c.name,
            code: c.code,
            fees: c.fees
        }));

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("[Public Course API Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
