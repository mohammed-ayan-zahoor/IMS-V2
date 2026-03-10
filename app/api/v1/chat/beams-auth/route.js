import { NextResponse } from "next/server";
import PushNotifications from "@pusher/push-notifications-server";
import { getInstituteScope } from "@/middleware/instituteScope";

const beamsClient = new PushNotifications({
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
    secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = scope.user.id;
        const { searchParams } = new URL(req.url);
        const beamsUserId = searchParams.get("user_id");

        if (!beamsUserId) {
            return NextResponse.json(
                { error: "Missing required parameter: user_id" },
                { status: 400 }
            );
        }

        // Security check: ensure the requested Beams user ID matches the logged-in user
        if (beamsUserId !== String(userId)) {
            return NextResponse.json(
                { error: "Inconsistent request. user_id must match authenticated user." },
                { status: 403 }
            );
        }
        const beamsToken = beamsClient.generateToken(userId);
        return NextResponse.json(beamsToken);

    } catch (error) {
        console.error("GET /api/v1/chat/beams-auth error:", error);
        return NextResponse.json({ error: "Failed to generate Beams token" }, { status: 500 });
    }
}
