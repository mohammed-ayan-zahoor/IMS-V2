import { NextResponse } from "next/server";
import { getInstituteScope } from "@/middleware/instituteScope";
import { getBeamsInstance } from "@/lib/pusher";

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

        const beamsClient = await getBeamsInstance(scope.instituteId);
        if (!beamsClient) {
            return NextResponse.json(
                { error: "Pusher Beams is not configured for this institute context." },
                { status: 500 }
            );
        }

        const beamsToken = beamsClient.generateToken(userId);
        return NextResponse.json(beamsToken);

    } catch (error) {
        console.error("GET /api/v1/chat/beams-auth error:", error);
        return NextResponse.json({ error: "Failed to generate Beams token" }, { status: 500 });
    }
}
