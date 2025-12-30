// C:\Users\Charge-entry18\Desktop\Projects\ims-v2\app\api\v1\batches\route.js
import { NextResponse } from "next/server";
import { BatchService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');

        const filters = {};
        if (courseId) filters.course = courseId;

        const batches = await BatchService.getBatches(filters);
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

        const body = await req.json();
        if (!body.name || !body.course) {
            return NextResponse.json({ error: "Name and course reference are required" }, { status: 400 });
        }

        const batch = await BatchService.createBatch(body, session.user.id);
        return NextResponse.json(batch, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
