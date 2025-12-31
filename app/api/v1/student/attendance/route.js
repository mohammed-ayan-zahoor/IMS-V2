import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Get batches first
        const studentBatches = await Batch.find({
            "enrolledStudents.student": session.user.id,
            "enrolledStudents.status": "active"
        }).select("_id");
        const batchIds = studentBatches.map(b => b._id);

        // Find attendance records for these batches
        const attendance = await Attendance.find({
            batch: { $in: batchIds },
            status: 'completed'
        })
            .populate("batch", "name")
            .sort({ date: -1 });

        // Map to simpler format for frontend, checking user's specific status
        const history = attendance.map(record => {
            const studentRecord = record.records.find(r => r.student.toString() === session.user.id);
            return {
                _id: record._id,
                date: record.date,
                batchName: record.batch?.name || "Unknown Batch",
                status: studentRecord ? studentRecord.status : "absent", // Default to absent if record exists but student not in list (edge case) or not marked
                topic: record.topic || "-"
            };
        });

        return NextResponse.json({ history });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
