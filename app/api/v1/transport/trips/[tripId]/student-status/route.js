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

        const { studentId, action, stopName } = body; // action: 'boarded' | 'alighted'
        if (!studentId || !["boarded", "alighted"].includes(action)) {
            return NextResponse.json(
                { error: "studentId and valid action ('boarded' | 'alighted') are required" },
                { status: 400 }
            );
        }

        const now = new Date();
        const newStatus = action === "boarded" ? "on_bus" : "alighted";

        const trip = await BusTripSession.findById(tripId);
        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        // Find or create student entry in studentsOnBoard
        const studentIndex = trip.studentsOnBoard.findIndex(
            item => item.student.toString() === studentId
        );

        if (studentIndex > -1) {
            trip.studentsOnBoard[studentIndex].status = newStatus;
            if (stopName) trip.studentsOnBoard[studentIndex].stop = stopName;
            if (action === "boarded") {
                trip.studentsOnBoard[studentIndex].boardedAt = now;
            } else if (action === "alighted") {
                trip.studentsOnBoard[studentIndex].alightedAt = now;
            }
        } else {
            trip.studentsOnBoard.push({
                student: studentId,
                stop: stopName || "Assigned Stop",
                status: newStatus,
                boardedAt: action === "boarded" ? now : undefined,
                alightedAt: action === "alighted" ? now : undefined
            });
        }

        await trip.save();

        // Trigger Pusher event for real-time notification to the parent's app
        try {
            const pusher = await getPusherInstance(trip.institute);
            if (pusher) {
                const channelName = `transport-student-${studentId}`;
                await pusher.trigger(channelName, "student-status", {
                    studentId,
                    action,
                    status: newStatus,
                    stopName: stopName || "",
                    timestamp: now
                });
            }
        } catch (pusherError) {
            console.error("Pusher trigger student-status error:", pusherError);
        }

        return NextResponse.json({ ok: true, status: newStatus, timestamp: now });

    } catch (error) {
        console.error("PATCH /api/v1/transport/trips/[tripId]/student-status error:", error);
        return NextResponse.json({ error: "Failed to update student status" }, { status: 500 });
    }
}
