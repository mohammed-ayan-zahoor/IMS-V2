import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/jwt";
import BusTripSession from "@/models/BusTripSession";
import Driver from "@/models/Driver";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const instituteId = searchParams.get("instituteId");

        await connectDB();

        // ── 1. STUDENT / PARENT LOOKUP ──────────────────────────────────────────
        if (studentId) {
            const activeTrip = await BusTripSession.findOne({
                status: "active",
                "studentsOnBoard.student": studentId
            })
            .populate({
                path: "vehicle",
                select: "registrationNumber type"
            })
            .populate({
                path: "route",
                select: "name stops"
            })
            .populate({
                path: "driver",
                select: "name phone photo"
            })
            .lean();

            if (!activeTrip) {
                return new NextResponse(null, { status: 204 }); // 204 No Active Trip
            }

            const studentStatusItem = (activeTrip.studentsOnBoard || []).find(
                s => s.student?.toString() === studentId
            );

            return NextResponse.json({
                trip: {
                    tripId: activeTrip._id,
                    vehicleId: activeTrip.vehicle?._id,
                    registrationNumber: activeTrip.vehicle?.registrationNumber || "Bus",
                    route: activeTrip.route,
                    lastLocation: activeTrip.lastLocation || null,
                    tripType: activeTrip.tripType,
                    startedAt: activeTrip.startedAt
                },
                studentStatus: studentStatusItem?.status || "not_boarded",
                stopName: studentStatusItem?.stop || "",
                boardedAt: studentStatusItem?.boardedAt || null,
                alightedAt: studentStatusItem?.alightedAt || null,
                driver: activeTrip.driver ? {
                    name: activeTrip.driver.name,
                    phone: activeTrip.driver.phone,
                    photo: activeTrip.driver.photo
                } : null
            });
        }

        // ── 2. FLEET / INSTITUTE LOOKUP (Admin Dashboard) ──────────────────────
        if (instituteId) {
            const activeTrips = await BusTripSession.find({
                institute: instituteId,
                status: "active"
            })
            .populate("vehicle", "registrationNumber type")
            .populate("route", "name stops")
            .populate("driver", "name phone")
            .lean();

            return NextResponse.json({ trips: activeTrips });
        }

        return NextResponse.json({ error: "studentId or instituteId query parameter is required" }, { status: 400 });

    } catch (error) {
        console.error("GET /api/v1/transport/trips/active error:", error);
        return NextResponse.json({ error: "Failed to fetch active trip" }, { status: 500 });
    }
}
