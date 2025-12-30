import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get("batchId");
        const dateString = searchParams.get("date");

        if (!batchId || !dateString) {
            return NextResponse.json({ error: "Batch ID and Date are required" }, { status: 400 });
        }

        const date = parseISO(dateString);

        // Find the single attendance document for this batch/date
        const attendanceDoc = await Attendance.findOne({
            batch: batchId,
            date: {
                $gte: startOfDay(date),
                $lte: endOfDay(date)
            },
            deletedAt: null
        }).populate("records.student", "profile.firstName profile.lastName enrollmentNumber");

        if (!attendanceDoc) {
            return NextResponse.json({ records: [] });
        }

        // Reshape for frontend: flatten the structure to look like a list of records
        const records = attendanceDoc.records.map(r => ({
            student: r.student, // Populated student object
            status: r.status,
            remarks: r.remarks
        }));

        return NextResponse.json({ records });

    } catch (error) {
        console.error("Fetch Attendance Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { batchId, date, records } = body;
        // records: [{ studentId, status, remarks }]

        if (!batchId || !date || !Array.isArray(records)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const targetDate = parseISO(date);

        // Transform frontend records to schema format
        const recordSchema = records.map(r => ({
            student: r.studentId,
            status: r.status,
            remarks: r.remarks || ""
        }));

        // Upsert the single document for this batch and date
        await Attendance.findOneAndUpdate(
            {
                batch: batchId,
                date: {
                    $gte: startOfDay(targetDate),
                    $lte: endOfDay(targetDate)
                }
            },
            {
                $set: {
                    batch: batchId,
                    date: targetDate,
                    records: recordSchema,
                    markedBy: session.user.id,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, count: records.length });

    } catch (error) {
        console.error("Save Attendance Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
