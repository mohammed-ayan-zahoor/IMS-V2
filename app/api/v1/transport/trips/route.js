import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/jwt";
import BusTripSession from "@/models/BusTripSession";
import User from "@/models/User";
import Driver from "@/models/Driver";

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const authUser = verifyToken(authHeader);

        if (!authUser || authUser.role !== "driver") {
            return NextResponse.json({ error: "Unauthorized. Driver access required." }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const vehicleId = body.vehicleId || authUser.vehicleId;
        const routeId = body.routeId || authUser.routeId;
        const tripType = body.tripType || "pickup";

        if (!vehicleId || !routeId) {
            return NextResponse.json(
                { error: "vehicleId and routeId are required to start a trip" },
                { status: 400 }
            );
        }

        // Check if there is already an active trip for this driver
        let activeTrip = await BusTripSession.findOne({
            driver: authUser.driverId,
            status: "active"
        });

        if (activeTrip) {
            // Return existing active trip
            const populatedTrip = await BusTripSession.findById(activeTrip._id)
                .populate({
                    path: "studentsOnBoard.student",
                    select: "profile enrollmentNumber transport"
                });

            return NextResponse.json({
                tripId: populatedTrip._id,
                status: populatedTrip.status,
                tripType: populatedTrip.tripType,
                students: (populatedTrip.studentsOnBoard || []).map(item => ({
                    _id: item.student?._id || item.student,
                    name: `${item.student?.profile?.firstName || ''} ${item.student?.profile?.lastName || ''}`.trim() || "Student",
                    photo: item.student?.profile?.avatar || null,
                    pickupStop: item.stop || item.student?.transport?.pickupStop || "",
                    status: item.status,
                    boardedAt: item.boardedAt,
                    alightedAt: item.alightedAt
                }))
            });
        }

        // Find students assigned to this vehicle / route
        const students = await User.find({
            institute: authUser.instituteId,
            role: "student",
            deletedAt: null,
            "transport.isAvailing": true,
            $or: [
                { "transport.route": routeId },
                { "transport.vehicle": vehicleId }
            ]
        }).select("profile enrollmentNumber transport").lean();

        const studentsOnBoard = students.map(s => ({
            student: s._id,
            stop: s.transport?.pickupStop || "Assigned Stop",
            status: "not_boarded"
        }));

        const newTrip = await BusTripSession.create({
            institute: authUser.instituteId,
            driver: authUser.driverId,
            vehicle: vehicleId,
            route: routeId,
            tripType,
            status: "active",
            studentsOnBoard
        });

        return NextResponse.json({
            tripId: newTrip._id,
            status: newTrip.status,
            tripType: newTrip.tripType,
            students: students.map((s, index) => ({
                _id: s._id,
                name: `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.trim() || "Student",
                photo: s.profile?.avatar || null,
                pickupStop: s.transport?.pickupStop || "Assigned Stop",
                status: "not_boarded"
            }))
        }, { status: 201 });

    } catch (error) {
        console.error("POST /api/v1/transport/trips error:", error);
        return NextResponse.json({ error: "Failed to start trip" }, { status: 500 });
    }
}
