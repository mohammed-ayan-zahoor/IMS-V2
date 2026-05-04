import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Session from "@/models/Session";
import Institute from "@/models/Institute";

export async function GET() {
    await connectDB();
    const inst = await Institute.findOne({ code: "QISDHL" });
    if (!inst) return NextResponse.json({ error: "Institute not found" });

    const correctSession = await Session.findOne({ sessionName: "25-26", instituteId: inst._id });
    
    if (!correctSession) return NextResponse.json({ error: "Session not found for QISDHL" });

    // Fix batches for this institute
    const result = await Batch.updateMany(
        { institute: inst._id },
        { $set: { session: correctSession._id } }
    );

    return NextResponse.json({
        message: "Fixed QISDHL",
        count: result.modifiedCount,
        session: correctSession._id
    });
}
