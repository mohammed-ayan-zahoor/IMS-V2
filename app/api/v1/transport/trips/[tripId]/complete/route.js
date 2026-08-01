import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/jwt";
import BusTripSession from "@/models/BusTripSession";

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

        const completedTrip = await BusTripSession.findByIdAndUpdate(
            tripId,
            {
                $set: {
                    status: "completed",
                    endedAt: new Date()
                }
            },
            { new: true }
        );

        if (!completedTrip) {
            return NextResponse.json({ error: "Trip session not found" }, { status: 404 });
        }

        return NextResponse.json({
            ok: true,
            status: "completed",
            endedAt: completedTrip.endedAt
        });

    } catch (error) {
        console.error("PATCH /api/v1/transport/trips/[tripId]/complete error:", error);
        return NextResponse.json({ error: "Failed to complete trip session" }, { status: 500 });
    }
}
