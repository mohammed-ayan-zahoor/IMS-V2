import { pusherServer } from '@/lib/pusher';
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return new Response("Unauthorized", { status: 401 });
        }

        // Parse application/x-www-form-urlencoded
        const text = await req.text();
        const params = new URLSearchParams(text);
        const socketId = params.get('socket_id');
        const channelName = params.get('channel_name');

        if (!socketId || !channelName) {
            return new Response("Missing parameters", { status: 400 });
        }

        // Security Check: Ensure user is actually part of this conversation
        if (channelName.startsWith('presence-conversation-')) {
            const conversationId = channelName.replace('presence-conversation-', '');
            const conversation = await Conversation.findOne({
                _id: conversationId,
                institute: scope.instituteId
            });

            if (!conversation || !conversation.participants.includes(scope.user.id)) {
                return new Response("Forbidden to access this channel", { status: 403 });
            }
        }

        // Construct presence data
        const presenceData = {
            user_id: scope.user.id,
            user_info: {
                name: scope.user.email, // Can add more info
                role: scope.user.role
            }
        };

        // Authenticate with Pusher
        const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
        return new Response(JSON.stringify(authResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Pusher auth error:", error);
        return new Response("Failed to authenticate with Pusher", { status: 500 });
    }
}
