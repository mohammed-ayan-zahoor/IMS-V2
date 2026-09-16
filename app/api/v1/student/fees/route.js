import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import TransportFee from "@/models/TransportFee";
import HostelAllotment from "@/models/HostelAllotment";
import Session from "@/models/Session";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId");
        const queryBatchId = searchParams.get("batchId");

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);
        const instituteId = session.user.institute?.id ? new mongoose.Types.ObjectId(session.user.institute.id) : null;

        // Retrieve enrolled batches for student selector
        let enrolledBatches = [];
        if (instituteId) {
            enrolledBatches = await Batch.find({
                institute: instituteId,
                enrolledStudents: {
                    $elemMatch: {
                        student: studentObjId,
                        status: { $in: ["active", "completed"] }
                    }
                },
                deletedAt: null
            }).select("_id name course").populate("course", "name code").lean();
        }

        const feeQuery = {
            student: studentObjId,
            deletedAt: null
        };
        if (instituteId) {
            feeQuery.institute = instituteId;
        }
        if (queryBatchId && queryBatchId !== "all" && mongoose.Types.ObjectId.isValid(queryBatchId)) {
            feeQuery.batch = new mongoose.Types.ObjectId(queryBatchId);
        }
        if (querySessionId && mongoose.Types.ObjectId.isValid(querySessionId)) {
            feeQuery.session = new mongoose.Types.ObjectId(querySessionId);
        }

        const transportQuery = { student: studentObjId, deletedAt: null };
        const hostelQuery = { student: studentObjId, deletedAt: null };
        if (instituteId) {
            transportQuery.institute = instituteId;
            hostelQuery.institute = instituteId;
        }

        const fees = await Fee.find(feeQuery)
            .populate({
                path: "batch",
                select: "name course",
                populate: {
                    path: "course",
                    select: "name code"
                }
            })
            .populate("institute", "name branding address contactEmail contactPhone settings")
            .sort({ updatedAt: -1 })
            .lean();

        const transportFees = await TransportFee.find(transportQuery)
            .populate("route vehicle preset")
            .sort({ updatedAt: -1 })
            .lean();

        const hostelAllotments = await HostelAllotment.find(hostelQuery)
            .populate("room block")
            .sort({ updatedAt: -1 })
            .lean();

        return NextResponse.json({
            fees,
            transportFees,
            hostelAllotments,
            batches: enrolledBatches.map(b => ({
                id: b._id.toString(),
                name: b.name,
                courseName: b.course?.name || "General",
                courseCode: b.course?.code || ""
            }))
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
