import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import { getInstituteScope } from "@/middleware/instituteScope";
import { pusherServer } from "@/lib/pusher";

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { messageIds, conversationId } = body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return NextResponse.json({ error: "Invalid message IDs" }, { status: 400 });
        }

        const currentUserId = scope.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(scope.user.role);

        // Batch update deletedAt for eligible messages
        // If not admin, can only delete own messages
        const query = {
            _id: { $in: messageIds },
            conversationId
        };

        if (!isAdmin) {
            query.sender = currentUserId;
        }

        const result = await Message.updateMany(
            query,
            { $set: { deletedAt: new Date() } }
        );

        // Broadcast the bulk deletion via Pusher
        const channelName = `presence-conversation-${conversationId}`;
        await pusherServer.trigger(channelName, 'messages-bulk-deleted', {
            messageIds,
            conversationId
        });

        return NextResponse.json({ 
            message: "Messages deleted successfully",
            count: result.modifiedCount
        });
    } catch (error) {
        console.error("POST /api/v1/chat/messages/bulk-delete error:", error);
        return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
    }
}
