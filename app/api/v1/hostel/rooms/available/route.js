import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelRoom from "@/models/HostelRoom";
import HostelAllotment from "@/models/HostelAllotment";
import HostelBlock from "@/models/HostelBlock";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: "Session is required" }, { status: 400 });
        }

        await connectDB();

        // 1. Fetch all active blocks
        const blockFilter = addInstituteFilter({ deletedAt: null, isActive: true }, scope);
        const blocks = await HostelBlock.find(blockFilter).sort({ name: 1 }).lean();

        // 2. Fetch all rooms
        const roomFilter = addInstituteFilter({ deletedAt: null }, scope);
        const rooms = await HostelRoom.find(roomFilter).sort({ roomNumber: 1 }).lean();

        // 3. Count current active allotments for each room
        const roomIds = rooms.map(r => r._id);
        const activeAllotments = await HostelAllotment.aggregate([
            {
                $match: {
                    institute: new mongoose.Types.ObjectId(scope.instituteId),
                    session: new mongoose.Types.ObjectId(sessionId),
                    room: { $in: roomIds },
                    status: 'active',
                    deletedAt: null
                }
            },
            {
                $group: {
                    _id: "$room",
                    count: { $sum: 1 }
                }
            }
        ]);

        const occupancyMap = {};
        activeAllotments.forEach(item => {
            occupancyMap[item._id.toString()] = item.count;
        });

        // 4. Map available rooms to their respective blocks
        const roomsWithOccupancy = rooms.map(room => {
            const currentOccupancy = occupancyMap[room._id.toString()] || 0;
            return {
                ...room,
                currentOccupancy,
                availableBeds: room.capacity - currentOccupancy,
                isAvailable: currentOccupancy < room.capacity
            };
        });

        const blocksWithRooms = blocks.map(block => {
            const blockRooms = roomsWithOccupancy.filter(
                room => room.block.toString() === block._id.toString() && room.isAvailable
            );
            return {
                ...block,
                rooms: blockRooms
            };
        }).filter(block => block.rooms.length > 0);

        return NextResponse.json({ blocks: blocksWithRooms });
    } catch (error) {
        console.error("GET /api/v1/hostel/rooms/available error:", error);
        return NextResponse.json({ error: "Failed to fetch available rooms" }, { status: 500 });
    }
}
