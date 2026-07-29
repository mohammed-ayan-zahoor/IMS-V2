import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getInstituteScope } from "@/middleware/instituteScope";
import { getPusherInstance } from "@/lib/pusher";

export async function POST(req, { params }) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const currentUserId = scope.user.id;

        const conversation = await Conversation.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        const isParticipant = conversation.participants.some(p => p.toString() === currentUserId.toString());
        if (!isParticipant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Add currentUserId to readBy array for all messages in this conversation where not present
        const result = await Message.updateMany(
            {
                conversationId: id,
                deletedAt: null,
                readBy: { $ne: currentUserId }
            },
            {
                $addToSet: { readBy: currentUserId }
            }
        );

        if (result.modifiedCount > 0) {
            const pusher = await getPusherInstance(scope.instituteId);
            if (pusher) {
                const channelName = `presence-conversation-${id}`;
                await pusher.trigger(channelName, 'messages-read', {
                    conversationId: id,
                    readerId: currentUserId
                });
            }
        }

        return NextResponse.json({ success: true, readCount: result.modifiedCount });
    } catch (error) {
        console.error("Failed to mark messages as read:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
