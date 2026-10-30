import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Batch from "@/models/Batch";
import Session from "@/models/Session";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        const instituteId = scope?.instituteId || session.user?.institute?.id || session.user?.institute?._id || (typeof session.user?.institute === 'string' ? session.user?.institute : null);

        // If user is a student, prioritize batches they are enrolled in
        if (session.user.role === 'student') {
            const studentObjId = new mongoose.Types.ObjectId(session.user.id);

            // Find all batches the student is enrolled in (active or completed)
            const batches = await Batch.find({
                "enrolledStudents.student": studentObjId,
                deletedAt: null
            }).select("session");

            const sessionIds = [...new Set(batches.map(b => b.session?.toString()).filter(Boolean))];

            if (sessionIds.length > 0) {
                const studentSessions = await Session.find({
                    _id: { $in: sessionIds },
                    deletedAt: null
                }).sort({ startDate: -1 });

                if (studentSessions.length > 0) {
                    return NextResponse.json({ sessions: studentSessions });
                }
            }
        }

        // For teachers, instructors, admins, or students without enrolled batches: return institute sessions
        if (instituteId) {
            const sessions = await Session.find({
                instituteId,
                deletedAt: null
            }).sort({ isActive: -1, startDate: -1, createdAt: -1 });

            return NextResponse.json({ sessions });
        }

        return NextResponse.json({ sessions: [] });

    } catch (error) {
        console.error("Fetch Student Sessions Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
