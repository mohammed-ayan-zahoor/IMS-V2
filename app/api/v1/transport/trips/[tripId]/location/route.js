import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/jwt";
import BusTripSession from "@/models/BusTripSession";
import { getPusherInstance } from "@/lib/pusher";

export async function PATCH(req, { params }) {
    try {
        const authHeader = req.headers.get("authorization");
        const authUser = verifyToken(authHeader);

        if (!authUser || authUser.role !== "driver") {
            return NextResponse.json({ error: "Unauthorized. Driver access required." }, { status: 401 });
        }

        const { tripId } = await params;
        if (!tripId) {
            return NextResponse.json({ error: "tripId parameter is required" }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();

        const { lat, lng, heading = 0, speed = 0 } = body;
        if (typeof lat !== "number" || typeof lng !== "number") {
            return NextResponse.json({ error: "Valid lat and lng coordinates required" }, { status: 400 });
        }

        const locationData = {
            lat,
            lng,
            heading,
            speed,
            timestamp: new Date()
        };

        const updatedTrip = await BusTripSession.findByIdAndUpdate(
            tripId,
            { $set: { lastLocation: locationData } },
            { new: true }
        );

        if (!updatedTrip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        // Trigger Pusher event for real-time parent & fleet map tracking
        try {
            const pusher = await getPusherInstance(updatedTrip.institute);
            if (pusher) {
                const channelName = `transport-inst-${updatedTrip.institute}`;
                await pusher.trigger(channelName, "bus-location", {
                    tripId: updatedTrip._id.toString(),
                    vehicleId: updatedTrip.vehicle.toString(),
                    routeId: updatedTrip.route.toString(),
                    lat,
                    lng,
                    heading,
                    speed,
                    timestamp: locationData.timestamp
                });
            }
        } catch (pusherError) {
            console.error("Pusher trigger bus-location error:", pusherError);
            // Do not fail the HTTP response if Pusher triggers error
        }

        return NextResponse.json({ ok: true, location: locationData });

    } catch (error) {
        console.error("PATCH /api/v1/transport/trips/[tripId]/location error:", error);
        return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
    }
}
