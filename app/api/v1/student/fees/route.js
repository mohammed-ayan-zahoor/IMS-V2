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

        const feeQuery = { student: session.user.id };
        const transportQuery = { student: session.user.id, deletedAt: null };
        const hostelQuery = { student: session.user.id, deletedAt: null };

        if (activeSession) {
            feeQuery.session = activeSession._id;
            transportQuery.session = activeSession._id;
            hostelQuery.session = activeSession._id;
        }

        const fees = await Fee.find(feeQuery)
            .populate({
                path: "batch",
                select: "name course",
                populate: {
                    path: "course",
                    select: "name"
                }
            })
            .sort({ updatedAt: -1 });

        const transportFees = await TransportFee.find(transportQuery)
            .populate("route vehicle preset")
            .sort({ updatedAt: -1 });

        const hostelAllotments = await HostelAllotment.find(hostelQuery)
            .populate("room block")
            .sort({ updatedAt: -1 });

        return NextResponse.json({ fees, transportFees, hostelAllotments });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
