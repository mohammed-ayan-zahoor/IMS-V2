import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Timetable from "@/models/Timetable";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get("batchId");

        if (!batchId || batchId === "all") {
            return NextResponse.json({ slots: [] });
        }

        const timetable = await Timetable.findOne({ batch: batchId, deletedAt: null }).lean();
        if (!timetable || !Array.isArray(timetable.timeSlots) || timetable.timeSlots.length === 0) {
            return NextResponse.json({ slots: [] });
        }

        const now = new Date();
        const curMin = now.getHours() * 60 + now.getMinutes();
        const parseMin = (tStr) => {
            if (!tStr) return 0;
            const [h, m] = tStr.split(":").map(Number);
            return (h || 0) * 60 + (m || 0);
        };

        const slots = timetable.timeSlots
            .filter(s => !s.isBreak)
            .map((s, index) => {
                const startMin = parseMin(s.startTime);
                const endMin = parseMin(s.endTime);
                const isCurrent = curMin >= startMin && curMin <= endMin;
                return {
                    _id: s._id.toString(),
                    name: s.name || `Period ${index + 1}`,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isCurrent
                };
            });

        return NextResponse.json({ slots });
    } catch (error) {
        console.error("Fetch Attendance Timetable Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
