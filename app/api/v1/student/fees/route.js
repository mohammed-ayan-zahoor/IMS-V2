import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import TransportFee from "@/models/TransportFee";
import HostelAllotment from "@/models/HostelAllotment";
import Session from "@/models/Session";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId") || req.headers.get("x-session-id");
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
            const sessionObjId = new mongoose.Types.ObjectId(querySessionId);
            const sessionBatches = await Batch.find({
                session: sessionObjId,
                deletedAt: null
            }).select('_id').lean();
            const sessionBatchIds = sessionBatches.map(b => b._id);

            feeQuery.$or = [
                { session: sessionObjId },
                { session: { $in: [null, undefined] }, batch: { $in: sessionBatchIds } }
            ];
        }

        const transportQuery = { student: studentObjId, deletedAt: null };
        const hostelQuery = { student: studentObjId, deletedAt: null };
        if (instituteId) {
            transportQuery.institute = instituteId;
            hostelQuery.institute = instituteId;
        }
        if (querySessionId && mongoose.Types.ObjectId.isValid(querySessionId)) {
            transportQuery.session = new mongoose.Types.ObjectId(querySessionId);
            hostelQuery.session = new mongoose.Types.ObjectId(querySessionId);
        }

        const [fees, studentUser, transportFees, hostelAllotments] = await Promise.all([
            Fee.find(feeQuery)
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
                .lean(),
            User.findById(studentObjId).select("scholarship rte").lean(),
            TransportFee.find(transportQuery)
                .populate("route vehicle preset")
                .sort({ updatedAt: -1 })
                .lean(),
            HostelAllotment.find(hostelQuery)
                .populate("room block")
                .sort({ updatedAt: -1 })
                .lean()
        ]);

        // Enrich fees with accurate concession/discount details for all institute types
        const enrichedFees = fees.map(f => {
            let discountAmount = f.discount?.amount || 0;
            let discountReason = f.discount?.reason || null;

            if (discountAmount <= 0 && studentUser?.scholarship?.hasScholarship) {
                if (studentUser.scholarship.scholarshipType === 'percentage') {
                    discountAmount = Math.round(((f.totalAmount || 0) * (studentUser.scholarship.scholarshipAmount || 0)) / 100);
                } else {
                    discountAmount = studentUser.scholarship.scholarshipAmount || 0;
                }
                discountReason = studentUser.scholarship.scholarshipName || "Institutional Scholarship";
            } else if (discountAmount <= 0 && studentUser?.rte?.isRte) {
                discountAmount = f.totalAmount || 0;
                discountReason = "RTE 100% Concession";
            }

            const netPayable = Math.max(0, (f.totalAmount || 0) - discountAmount + (f.extraCharges?.amount || 0));

            return {
                ...f,
                discount: {
                    amount: discountAmount,
                    reason: discountReason || "Fee Concession"
                },
                concession: {
                    amount: discountAmount,
                    reason: discountReason || "Fee Concession"
                },
                concessionAmount: discountAmount,
                concessionReason: discountReason || "Fee Concession",
                netPayable
            };
        });

        return NextResponse.json({
            fees: enrichedFees,
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
