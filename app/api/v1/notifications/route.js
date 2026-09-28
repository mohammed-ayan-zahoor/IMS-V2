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
        const allowedRoles = [userRole];
        if (userRole === "super_admin") allowedRoles.push("admin");

        const query = {
            institute: instituteId,
            dismissedBy: { $ne: userId },
            $or: [
                { recipient: userId },
                { recipientRole: { $in: allowedRoles } }
            ]
        };

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

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

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id;
        const userRole = session.user.role;
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const notificationId = searchParams.get("id");

        await connectDB();

        if (notificationId) {
            // Dismiss specific notification
            await Notification.updateOne(
                { _id: notificationId, institute: instituteId },
                { $addToSet: { dismissedBy: userId } }
            );
        } else {
            // Dismiss all notifications currently visible to this user
            const allowedRoles = [userRole];
            if (userRole === "super_admin") allowedRoles.push("admin");

            const query = {
                institute: instituteId,
                $or: [
                    { recipient: userId },
                    { recipientRole: { $in: allowedRoles } }
                ]
            };

            await Notification.updateMany(
                query,
                { $addToSet: { dismissedBy: userId } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/notifications error:", error);
        return NextResponse.json({ error: "Failed to dismiss notification(s)" }, { status: 500 });
    }
}
