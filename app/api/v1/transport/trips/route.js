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
            // Return existing active trip with populated route, vehicle & student details
            const populatedTrip = await BusTripSession.findById(activeTrip._id)
                .populate("route", "name stops distance")
                .populate("vehicle", "registrationNumber type capacity")
                .populate({
                    path: "studentsOnBoard.student",
                    select: "profile enrollmentNumber transport"
                })
                .lean();

            const stopsList = populatedTrip.route?.stops || [];
            const mappedStudents = (populatedTrip.studentsOnBoard || []).map(item => {
                const stopName = item.stop || item.student?.transport?.pickupStop || "Assigned Stop";
                const seatNo = item.student?.transport?.seatNumber || item.student?.enrollmentNumber || "";
                const fullName = `${item.student?.profile?.firstName || ''} ${item.student?.profile?.lastName || ''}`.trim() || "Student";
                return {
                    _id: item.student?._id || item.student,
                    name: fullName,
                    photo: item.student?.profile?.avatar || null,
                    pickupStop: stopName,
                    stop: stopName,
                    stopName: stopName,
                    seat: seatNo,
                    seatNumber: seatNo,
                    status: item.status,
                    boardedAt: item.boardedAt,
                    alightedAt: item.alightedAt
                };
            });

            return NextResponse.json({
                tripId: populatedTrip._id,
                status: populatedTrip.status,
                tripType: populatedTrip.tripType,
                route: populatedTrip.route || null,
                stops: stopsList,
                vehicle: populatedTrip.vehicle || null,
                registrationNumber: populatedTrip.vehicle?.registrationNumber || "Bus",
                students: mappedStudents
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

        const createdTrip = await BusTripSession.findById(newTrip._id)
            .populate("route", "name stops distance")
            .populate("vehicle", "registrationNumber type capacity")
            .lean();

        const stopsList = createdTrip?.route?.stops || [];
        const mappedStudents = students.map(s => {
            const stopName = s.transport?.pickupStop || "Assigned Stop";
            const seatNo = s.transport?.seatNumber || s.enrollmentNumber || "";
            const fullName = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.trim() || "Student";
            return {
                _id: s._id,
                name: fullName,
                photo: s.profile?.avatar || null,
                pickupStop: stopName,
                stop: stopName,
                stopName: stopName,
                seat: seatNo,
                seatNumber: seatNo,
                status: "not_boarded"
            };
        });

        return NextResponse.json({
            tripId: createdTrip._id,
            status: createdTrip.status,
            tripType: createdTrip.tripType,
            route: createdTrip.route || null,
            stops: stopsList,
            vehicle: createdTrip.vehicle || null,
            registrationNumber: createdTrip.vehicle?.registrationNumber || "Bus",
            students: mappedStudents
        }, { status: 201 });

    } catch (error) {
        console.error("POST /api/v1/transport/trips error:", error);
        return NextResponse.json({ error: "Failed to start trip" }, { status: 500 });
    }
}
