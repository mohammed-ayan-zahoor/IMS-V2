import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelRoom from "@/models/HostelRoom";
import HostelBlock from "@/models/HostelBlock";
import HostelAllotment from "@/models/HostelAllotment";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const blockId = searchParams.get('blockId');
        const type = searchParams.get('type');
        const sessionId = searchParams.get('sessionId');

        await connectDB();

        const filter = addInstituteFilter({ deletedAt: null }, scope);
        if (blockId) filter.block = blockId;
        if (type) filter.type = type;

        const rooms = await HostelRoom.find(filter)
            .populate('block', 'name type')
            .sort({ roomNumber: 1 })
            .lean();

        // Calculate occupancy based on current active allotments
        const roomIds = rooms.map(r => r._id);
        const allotmentMatch = {
            room: { $in: roomIds },
            status: 'active',
            deletedAt: null
        };
        if (sessionId) {
            allotmentMatch.session = new mongoose.Types.ObjectId(sessionId);
        }

        const occupancyData = await HostelAllotment.aggregate([
            { $match: allotmentMatch },
            { $group: { _id: "$room", count: { $sum: 1 } } }
        ]);

        const occupancyMap = {};
        occupancyData.forEach(item => {
            occupancyMap[item._id.toString()] = item.count;
        });

        const roomsWithOccupancy = rooms.map(room => {
            const currentOccupancy = occupancyMap[room._id.toString()] || 0;
            return {
                ...room,
                currentOccupancy,
                isAvailable: currentOccupancy < room.capacity
            };
        });

        return NextResponse.json({ rooms: roomsWithOccupancy });
    } catch (error) {
        console.error("GET /api/v1/hostel/rooms error:", error);
        return NextResponse.json({ error: "Failed to fetch hostel rooms" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { block, roomNumber, floor, type, capacity, monthlyRent, amenities } = body;

        // Validation
        if (!block) {
            return NextResponse.json({ error: "Block is required" }, { status: 400 });
        }
        if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim().length === 0) {
            return NextResponse.json({ error: "Room number is required" }, { status: 400 });
        }
        if (!capacity || parseInt(capacity, 10) < 1) {
            return NextResponse.json({ error: "Valid capacity is required" }, { status: 400 });
        }
        if (monthlyRent === undefined || parseFloat(monthlyRent) < 0) {
            return NextResponse.json({ error: "Valid monthly rent is required" }, { status: 400 });
        }

        // Verify block exists and belongs to this institute
        const existingBlock = await HostelBlock.findOne({ _id: block, institute: scope.instituteId, deletedAt: null });
        if (!existingBlock) {
            return NextResponse.json({ error: "Selected block does not exist" }, { status: 404 });
        }

        const roomData = {
            institute: scope.instituteId,
            block,
            roomNumber: roomNumber.trim(),
            floor: floor ? parseInt(floor, 10) : 0,
            type: ['single', 'double', 'triple', 'dormitory'].includes(type) ? type : 'double',
            capacity: parseInt(capacity, 10),
            monthlyRent: parseFloat(monthlyRent),
            amenities: Array.isArray(amenities) ? amenities : []
        };

        const room = await HostelRoom.create(roomData);

        // Update totalRooms counter in parent HostelBlock
        await HostelBlock.findByIdAndUpdate(block, { $inc: { totalRooms: 1 } });

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.room.create',
                resource: { type: 'HostelRoom', id: room._id },
                institute: scope.instituteId,
                details: { roomNumber: room.roomNumber, capacity: room.capacity }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ room });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A room with this number already exists in this block" }, { status: 400 });
        }
        console.error("POST /api/v1/hostel/rooms error:", error);
        return NextResponse.json({ error: "Failed to create hostel room" }, { status: 500 });
    }
}
