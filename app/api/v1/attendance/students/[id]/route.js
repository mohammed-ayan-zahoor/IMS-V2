
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || new Date().getFullYear());
        const sessionId = searchParams.get('session');

        await connectDB();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Build query
        const query = {
            date: { $gte: startDate, $lte: endDate },
            "records.student": id
        };

        // If session is provided, we need to filter by batches belonging to that session
        if (sessionId) {
            // Find all batches for this session
            const Batch = mongoose.models.Batch || (await import("@/models/Batch")).default;
            const sessionBatches = await Batch.find({ session: sessionId }).select("_id");
            const batchIds = sessionBatches.map(b => b._id);
            query.batch = { $in: batchIds };
        }

        // Find attendance records for this student in this range
        const attendanceRecords = await Attendance.find(query)
            .select("date batch records.$")
            .populate("batch", "name session")
            .sort({ date: 1 });

        // Transform data for frontend
        const attendance = attendanceRecords.map(doc => {
            const record = doc.records[0]; // records.$ returns exactly one matching element
            return {
                _id: doc._id,
                date: doc.date,
                batch: doc.batch,
                status: record?.status || "unknown",
                remarks: record?.remarks
            };
        });

        // Calculate stats
        const stats = {
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            excused: attendance.filter(a => a.status === 'excused').length,
            total: attendance.length
        };

        return NextResponse.json({ attendance, stats });

    } catch (error) {
        console.error("API Error [Student Attendance]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
