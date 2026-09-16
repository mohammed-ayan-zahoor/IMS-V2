import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        let page = parseInt(searchParams.get("page")) || 1;
        let limit = parseInt(searchParams.get("limit")) || 100;
        if (limit > 200) limit = 200;
        if (page < 1) page = 1;

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);
        const instituteId = session.user.institute?.id ? new mongoose.Types.ObjectId(session.user.institute.id) : null;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        // Retrieve enrolled batches for the student in this institute
        const enrolledBatches = await Batch.find({
            institute: instituteId,
            enrolledStudents: {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            }
        }).select("_id name course").populate("course", "name code").lean();

        const query = {
            institute: instituteId,
            records: {
                $elemMatch: {
                    student: studentObjId
                }
            }
        };

        const batchIdParam = searchParams.get("batchId");
        if (batchIdParam && batchIdParam !== "all") {
            try {
                query.batch = new mongoose.Types.ObjectId(batchIdParam);
            } catch {
                // Ignore invalid ObjectId format
            }
        }

        const monthParam = searchParams.get("month");
        const yearParam = searchParams.get("year");
        if (monthParam && yearParam) {
            const m = parseInt(monthParam);
            const y = parseInt(yearParam);
            if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
                const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
                const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
                query.date = { $gte: startDate, $lte: endDate };
            }
        }

        // Find attendance records for this student and institute
        const [attendance, totalCount] = await Promise.all([
            Attendance.find(query)
                .populate("batch", "name")
                .populate("markedBy", "profile role name")
                .sort({ date: 1 })
                .lean(),
            Attendance.countDocuments(query)
        ]);

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

            const facultyName = record.markedBy?.profile
                ? `${record.markedBy.profile.firstName || ''} ${record.markedBy.profile.lastName || ''}`.trim()
                : (record.markedBy?.name || "Faculty In-Charge");

            return {
                _id: record._id,
                date: record.date,
                batchId: record.batch?._id || "",
                batchName: record.batch?.name || "Academic Session",
                status,
                method: studentRecord?.method || "manual",
                slot: studentRecord?.slot || "checkin",
                markedAt: studentRecord?.markedAt || record.createdAt || null,
                periodName: studentRecord?.periodName || record.periodName || "Regular Lecture",
                remarks: studentRecord?.remarks || "",
                markedByName: facultyName,
                topic: record.topic || "-"
            };
        });

        const totalMarked = present + absent + late + excused;
        const rate = totalMarked > 0 ? Math.min(100, Math.round(((present + late) / totalMarked) * 100)) : 0;

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
            batches: enrolledBatches.map(b => ({
                _id: String(b._id),
                name: b.name,
                courseName: b.course?.name || b.name,
                courseCode: b.course?.code || ""
            })),
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

