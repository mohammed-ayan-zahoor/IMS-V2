import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import mongoose from "mongoose";
import Session from "@/models/Session";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await connectDB();

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId");

        let activeSession = null;
        if (querySessionId && session.user.institute?.id) {
            // Verify the session belongs to this student's institute before trusting it.
            try {
                activeSession = await Session.findOne({
                    _id: new mongoose.Types.ObjectId(querySessionId),
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).select("_id");
            } catch {
                activeSession = null; // malformed ObjectId — fall through
            }
        }

        if (!activeSession && session.user.institute?.id) {
            activeSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                isActive: true,
                deletedAt: null
            }).select("_id");
            if (!activeSession) {
                activeSession = await Session.findOne({
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).select("_id").sort({ startDate: -1 });
            }
        }

        const query = {
            enrolledStudents: {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        };

        if (activeSession) {
            query.session = { $in: [activeSession._id, null] };
        }

        const batches = await Batch.find(query)
            .populate({
                path: "course",
                select: "name code subjects",
                populate: {
                    path: "subjects",
                    select: "name"
                }
            })
            .select("name schedule instructor course"); // Select entire schedule object and course

        return NextResponse.json({ batches });

    } catch (error) {
        console.error("Fetch Student Batches Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
