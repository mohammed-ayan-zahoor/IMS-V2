import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const batches = await Batch.find({
            "enrolledStudents.student": session.user.id,
            "enrolledStudents.status": "active",
            deletedAt: null
        })
            .populate("course", "name code")
            .select("name schedule startDate endDate room");

        return NextResponse.json({ batches });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
