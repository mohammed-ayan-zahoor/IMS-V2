import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Student from "@/models/User"; // Use User model for students
import Batch from "@/models/Batch";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const instituteId = session.user.institute?.id;
        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batchId");
        const startDateString = searchParams.get("startDate");
        const endDateString = searchParams.get("endDate");

        if (!instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(instituteId)) {
            return NextResponse.json({ error: "Invalid institute ID" }, { status: 400 });
        }

        // Base match for Attendance Documents
        const matchStage = {
            institute: new mongoose.Types.ObjectId(instituteId),
            deletedAt: null
        };

        if (batchId) {
            if (!mongoose.Types.ObjectId.isValid(batchId)) {
                return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
            }
            matchStage.batch = new mongoose.Types.ObjectId(batchId);
        } else if (courseId) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
            }
            // Find all batches for this course to filter attendance
            const courseBatchIds = await Batch.find({
                course: courseId,
                institute: instituteId,
                status: 'active'
            }).distinct('_id');

            matchStage.batch = { $in: courseBatchIds };
        }

        if (startDateString && endDateString) {
            matchStage.date = {
                $gte: startOfDay(parseISO(startDateString)),
                $lte: endOfDay(parseISO(endDateString))
            };
        }

        // MongoDB Aggregation Pipeline
        const pipeline = [
            // 1. Match Attendance Documents (by Institute, Batch, Date)
            { $match: matchStage },

            // 2. Unwind records to process individual student statuses
            { $unwind: "$records" },

            // 3. Group by Student to calculate stats
            {
                $group: {
                    _id: "$records.student",
                    totalDays: { $sum: 1 },
                    present: {
                        $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] }
                    },
                    absent: {
                        $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] }
                    },
                    late: {
                        $sum: { $cond: [{ $eq: ["$records.status", "late"] }, 1, 0] }
                    },
                    excused: {
                        $sum: { $cond: [{ $eq: ["$records.status", "excused"] }, 1, 0] }
                    }
                }
            },

            // 4. Lookup Student Details
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },

            // 5. Unwind student info with preservation
            {
                $unwind: {
                    path: "$studentInfo",
                    preserveNullAndEmptyArrays: true
                }
            },

            // 6. Project final shape
            {
                $project: {
                    _id: 1,
                    name: {
                        $concat: [
                            { $ifNull: ["$studentInfo.profile.firstName", ""] },
                            " ",
                            { $ifNull: ["$studentInfo.profile.lastName", ""] }
                        ]
                    },
                    enrollmentNumber: { $ifNull: ["$studentInfo.enrollmentNumber", "Unknown"] },
                    totalDays: 1,
                    present: 1,
                    absent: 1,
                    late: 1,
                    excused: 1,
                    percentage: {
                        $cond: [
                            { $eq: ["$totalDays", 0] },
                            0,
                            { $multiply: [{ $divide: ["$present", "$totalDays"] }, 100] }
                        ]
                    }
                }
            },

            // 7. Sort by Name
            { $sort: { name: 1 } }
        ];

        const report = await Attendance.aggregate(pipeline);

        return NextResponse.json({ report });

    } catch (error) {
        console.error("Attendance Report Error:", error);
        return NextResponse.json({ error: "Failed to generate attendance report" }, { status: 500 });
    }
}
