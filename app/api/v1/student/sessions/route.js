import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Session from "@/models/Session";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);

        // Find all batches the student is enrolled in (active or completed)
        const batches = await Batch.find({
            "enrolledStudents.student": studentObjId,
            deletedAt: null
        }).select("session");

        const sessionIds = [...new Set(batches.map(b => b.session?.toString()).filter(Boolean))];

        // Fetch session details, sorted by date descending (latest first)
        const studentSessions = await Session.find({
            _id: { $in: sessionIds },
            deletedAt: null
        }).sort({ startDate: -1 });

        return NextResponse.json({ sessions: studentSessions });

    } catch (error) {
        console.error("Fetch Student Sessions Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
