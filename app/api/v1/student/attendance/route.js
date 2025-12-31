import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        let page = parseInt(searchParams.get("page")) || 1;
        let limit = parseInt(searchParams.get("limit")) || 20;
        if (limit > 100) limit = 100;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;

        // Get batches first
        const studentBatches = await Batch.find({
            "enrolledStudents.student": session.user.id,
            "enrolledStudents.status": "active"
        }).select("_id");
        const batchIds = studentBatches.map(b => b._id);

        const query = { batch: { $in: batchIds } };

        // Find attendance records for these batches
        const [attendance, totalCount] = await Promise.all([
            Attendance.find(query)
                .populate("batch", "name")
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit),
            Attendance.countDocuments(query)
        ]);

        // Map to simpler format for frontend, checking user's specific status
        const history = attendance.map(record => {
            // Safe comparison without forcing .toString() on potential nulls
            const studentRecord = record.records.find(r => r.student && String(r.student) === session.user.id);
            return {
                _id: record._id,
                date: record.date,
                batchName: record.batch?.name || "Unknown Batch",
                status: studentRecord ? studentRecord.status : "absent",
                topic: record.topic || "-"
            };
        });

        return NextResponse.json({
            history,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error("Attendance API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
