import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor", "staff"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { batchId, date, studentId, status = "present", slot = "checkin", method = "face", remarks = "" } = body;

        if (!batchId || !date || !studentId) {
            return NextResponse.json({ error: "batchId, date, and studentId are required" }, { status: 400 });
        }

        const batchDoc = await Batch.findById(batchId).select("institute");
        if (!batchDoc || !batchDoc.institute) {
            return NextResponse.json({ error: "Batch not found or has no institute" }, { status: 404 });
        }

        const targetDate = parseISO(date);
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // Find existing attendance doc for batch & date or initialize
        let attendanceDoc = await Attendance.findOne({
            batch: batchId,
            date: { $gte: dayStart, $lte: dayEnd }
        });

        if (!attendanceDoc) {
            attendanceDoc = await Attendance.create({
                institute: batchDoc.institute,
                batch: batchId,
                date: targetDate,
                records: [{
                    student: studentId,
                    status,
                    slot,
                    markedAt: new Date(),
                    method,
                    remarks
                }],
                markedBy: session.user.id
            });
        } else {
            // Check if record exists for this student & slot
            const existingRecordIndex = (attendanceDoc.records || []).findIndex(
                r => r.student?.toString() === studentId.toString() && (r.slot || "checkin") === slot
            );

            if (existingRecordIndex > -1) {
                // Update existing record atomically
                await Attendance.updateOne(
                    { _id: attendanceDoc._id, "records._id": attendanceDoc.records[existingRecordIndex]._id },
                    {
                        $set: {
                            "records.$.status": status,
                            "records.$.markedAt": new Date(),
                            "records.$.method": method,
                            "records.$.remarks": remarks || attendanceDoc.records[existingRecordIndex].remarks || "",
                            markedBy: session.user.id,
                            updatedAt: new Date()
                        }
                    }
                );
            } else {
                // Push new record for student and slot
                await Attendance.updateOne(
                    { _id: attendanceDoc._id },
                    {
                        $push: {
                            records: {
                                student: studentId,
                                status,
                                slot,
                                markedAt: new Date(),
                                method,
                                remarks
                            }
                        },
                        $set: {
                            markedBy: session.user.id,
                            updatedAt: new Date()
                        }
                    }
                );
            }
        }

        return NextResponse.json({ success: true, studentId, slot, status });
    } catch (error) {
        console.error("Single Attendance Patch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
