import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await connectDB();

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);

        const batches = await Batch.find({
            enrolledStudents: {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        })
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
