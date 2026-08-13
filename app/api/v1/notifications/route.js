import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id;
        const userRole = session.user.role;
        const userId = session.user.id;

        await connectDB();

        // Query notifications for this institute and matching role or direct user recipient
        const query = {
            institute: instituteId,
            $or: [
                { recipient: userId },
                { recipientRole: userRole },
                { recipientRole: "admin" }
            ]
        };

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({
            ...query,
            read: false
        });

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error("GET /api/v1/notifications error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { notificationId } = body;

        await connectDB();

        if (notificationId) {
            await Notification.findByIdAndUpdate(notificationId, { read: true });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/v1/notifications error:", error);
        return NextResponse.json({ error: "Failed to mark notification read" }, { status: 500 });
    }
}
