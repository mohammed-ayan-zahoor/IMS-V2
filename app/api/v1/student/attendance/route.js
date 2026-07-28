import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
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

        const { searchParams } = new URL(req.url);
        let page = parseInt(searchParams.get("page")) || 1;
        let limit = parseInt(searchParams.get("limit")) || 20;
        if (limit > 100) limit = 100;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId");

        let activeSession = null;
        if (querySessionId) {
            activeSession = { _id: new mongoose.Types.ObjectId(querySessionId) };
        } else if (session.user.institute?.id) {
            activeSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                isActive: true,
                deletedAt: null
            });
            if (!activeSession) {
                activeSession = await Session.findOne({
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).sort({ startDate: -1 });
            }
        }

        const batchQuery = {
            enrolledStudents: {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        };

        if (activeSession) {
            batchQuery.session = activeSession._id;
        }

        // Get batches first with correct elemMatch query
        const studentBatches = await Batch.find(batchQuery).select("_id");
        const batchIds = studentBatches.map(b => b._id);

        const monthParam = searchParams.get("month");
        const yearParam = searchParams.get("year");

        const query = {
            batch: { $in: batchIds },
            records: {
                $elemMatch: {
                    student: studentObjId
                }
            }
        };

        if (monthParam && yearParam) {
            const m = parseInt(monthParam);
            const y = parseInt(yearParam);
            const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
            query.date = { $gte: startDate, $lte: endDate };
        }

        // Find attendance records for these batches
        const [attendance, totalCount] = await Promise.all([
            Attendance.find(query)
                .populate("batch", "name")
                .sort({ date: 1 }), // ascending date order for calendar/list
            Attendance.countDocuments(query)
        ]);

        // Map to simpler format for frontend, checking user's specific status
        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;
        let holiday = 0;

        const history = attendance.map(record => {
            const studentRecord = record.records.find(r => r.student && String(r.student) === session.user.id);
            const status = studentRecord ? studentRecord.status : "absent";
            
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'late') late++;
            else if (status === 'excused') excused++;
            else if (status === 'holiday') holiday++;

            return {
                _id: record._id,
                date: record.date,
                batchId: record.batch?._id || "",
                batchName: record.batch?.name || "Unknown Batch",
                status,
                topic: record.topic || "-"
            };
        });

        const totalMarked = present + absent + late + excused;
        const rate = totalMarked > 0 ? Math.min(100, Math.round((present / totalMarked) * 100)) : 0;

        const stats = {
            present,
            absent,
            late,
            excused,
            holiday,
            total: totalMarked,
            rate
        };

        return NextResponse.json({
            history,
            stats,
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
