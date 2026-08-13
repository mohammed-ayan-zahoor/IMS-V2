import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id;
        const userRole = session.user.role;
        const userId = session.user.id;

        await connectDB();

        await Notification.updateMany(
            {
                institute: instituteId,
                read: false,
                $or: [
                    { recipient: userId },
                    { recipientRole: userRole },
                    { recipientRole: "admin" }
                ]
            },
            { read: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/v1/notifications/read-all error:", error);
        return NextResponse.json({ error: "Failed to mark all read" }, { status: 500 });
    }
}
