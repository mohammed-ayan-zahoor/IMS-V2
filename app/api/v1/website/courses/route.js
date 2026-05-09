import { connectDB } from "@/lib/mongodb";
import Course from "@/models/Course";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) return Response.json({ error: "instituteId required" }, { status: 400 });

        await connectDB();
        const courses = await Course.find({ instituteId, status: 'ACTIVE' })
            .select('name description duration fees')
            .limit(6);

        return Response.json({ courses });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
