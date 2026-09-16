import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";
import { sendAttendancePushNotifications } from "../route";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor", "staff"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { batchId, date, studentId, status = "present", slot = "checkin", method = "face", periodId = null, periodName = "", remarks = "" } = body;

        const studentIdList = Array.isArray(body.studentIds)
            ? body.studentIds.filter(Boolean)
            : (studentId ? [studentId] : []);

        if (!batchId || !date || studentIdList.length === 0) {
            return NextResponse.json({ error: "batchId, date, and studentId (or studentIds) are required" }, { status: 400 });
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
            const records = studentIdList.map(sId => {
                const rec = {
                    student: sId,
                    status,
                    slot,
                    markedAt: new Date(),
                    method,
                    remarks
                };
                if (periodId) rec.periodId = periodId;
                if (periodName) rec.periodName = periodName;
                return rec;
            });

            attendanceDoc = await Attendance.create({
                institute: batchDoc.institute,
                batch: batchId,
                date: targetDate,
                records,
                markedBy: session.user.id
            });
        } else {
            for (const sId of studentIdList) {
                const existingRecordIndex = (attendanceDoc.records || []).findIndex(
                    r => r.student?.toString() === sId.toString() &&
                        (r.slot || "checkin") === slot &&
                        ((!r.periodId && !periodId) || (r.periodId?.toString() === periodId?.toString()))
                );

                if (existingRecordIndex > -1) {
                    attendanceDoc.records[existingRecordIndex].status = status;
                    attendanceDoc.records[existingRecordIndex].markedAt = new Date();
                    attendanceDoc.records[existingRecordIndex].method = method;
                    if (remarks) attendanceDoc.records[existingRecordIndex].remarks = remarks;
                    if (periodId) attendanceDoc.records[existingRecordIndex].periodId = periodId;
                    if (periodName) attendanceDoc.records[existingRecordIndex].periodName = periodName;
                } else {
                    const newRec = {
                        student: sId,
                        status,
                        slot,
                        markedAt: new Date(),
                        method,
                        remarks
                    };
                    if (periodId) newRec.periodId = periodId;
                    if (periodName) newRec.periodName = periodName;
                    attendanceDoc.records.push(newRec);
                }
            }

            attendanceDoc.markedBy = session.user.id;
            attendanceDoc.updatedAt = new Date();
            await attendanceDoc.save();
        }

        // Trigger push notification and MongoDB notification record creation
        const notifPayload = studentIdList.map(sId => ({ studentId: sId, status }));
        sendAttendancePushNotifications(batchDoc.institute, batchId, notifPayload).catch(err => {
            console.error("[Attendance Push] Non-blocking push notification error:", err);
        });

        return NextResponse.json({ success: true, studentId, slot, periodId, status });
    } catch (error) {
        console.error("Single Attendance Patch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
