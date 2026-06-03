import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelBlock from "@/models/HostelBlock";
import HostelRoom from "@/models/HostelRoom";
import HostelAllotment from "@/models/HostelAllotment";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session');

        if (!sessionId) {
            return NextResponse.json({ error: "Session is required" }, { status: 400 });
        }

        await connectDB();

        const instId = new mongoose.Types.ObjectId(scope.instituteId);
        const sessId = new mongoose.Types.ObjectId(sessionId);

        // 1. Total Blocks Count
        const blockFilter = addInstituteFilter({ deletedAt: null }, scope);
        const totalBlocks = await HostelBlock.countDocuments(blockFilter);

        // 2. Total Rooms & Total Capacity (Beds)
        const roomFilter = addInstituteFilter({ deletedAt: null }, scope);
        const roomStats = await HostelRoom.aggregate([
            { $match: { institute: instId, deletedAt: null } },
            {
                $group: {
                    _id: null,
                    totalRooms: { $sum: 1 },
                    totalCapacity: { $sum: "$capacity" }
                }
            }
        ]);

        const totalRooms = roomStats[0]?.totalRooms || 0;
        const totalCapacity = roomStats[0]?.totalCapacity || 0;

        // 3. Occupied Beds count
        const occupiedBeds = await HostelAllotment.countDocuments({
            institute: instId,
            session: sessId,
            status: 'active',
            deletedAt: null
        });

        // 4. Financial totals
        const financialStats = await HostelAllotment.aggregate([
            {
                $match: {
                    institute: instId,
                    session: sessId,
                    deletedAt: null
                }
            },
            {
                $group: {
                    _id: null,
                    totalGross: { $sum: "$totalAmount" },
                    totalCollected: { $sum: "$paidAmount" },
                    totalPending: { $sum: "$balanceAmount" }
                }
            }
        ]);

        const totalGross = financialStats[0]?.totalGross || 0;
        const totalCollected = financialStats[0]?.totalCollected || 0;
        const totalPending = financialStats[0]?.totalPending || 0;

        return NextResponse.json({
            totalBlocks,
            totalRooms,
            totalCapacity,
            occupiedBeds,
            availableBeds: Math.max(0, totalCapacity - occupiedBeds),
            totalGross,
            totalCollected,
            totalPending
        });
    } catch (error) {
        console.error("GET /api/v1/hostel/stats error:", error);
        return NextResponse.json({ error: "Failed to fetch hostel stats" }, { status: 500 });
    }
}
