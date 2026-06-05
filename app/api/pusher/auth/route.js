import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPusherInstance } from "@/lib/pusher";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // Extract institute context from session
        const instituteId = session.user.institute?.id || session.user.instituteId;

        const body = await req.formData();
        const socketId = body.get('socket_id');
        const channelName = body.get('channel_name');

        const presenceData = {
            user_id: session.user.id,
            user_info: {
                id: session.user.id,
                name: session.user.name || session.user.email,
                role: session.user.role
            },
        };

        const pusher = await getPusherInstance(instituteId);
        const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
        return Response.json(authResponse);
    } catch (error) {
        console.error("Pusher Auth Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
