import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import TransportFee from "@/models/TransportFee";
import HostelAllotment from "@/models/HostelAllotment";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const fees = await Fee.find({
            student: session.user.id
        })
            .populate("batch", "name")
            .sort({ updatedAt: -1 });

        const transportFees = await TransportFee.find({
            student: session.user.id,
            deletedAt: null
        })
            .populate("route vehicle preset")
            .sort({ updatedAt: -1 });

        const hostelAllotments = await HostelAllotment.find({
            student: session.user.id,
            deletedAt: null
        })
            .populate("room block")
            .sort({ updatedAt: -1 });

        return NextResponse.json({ fees, transportFees, hostelAllotments });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
