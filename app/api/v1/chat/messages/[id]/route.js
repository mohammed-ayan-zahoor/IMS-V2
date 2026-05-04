import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { getInstituteScope } from "@/middleware/instituteScope";
import { pusherServer } from "@/lib/pusher";

export async function DELETE(req, { params }) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const currentUserId = scope.user.id;

        const message = await Message.findById(id);
        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // Check if user is the sender OR an admin
        const isAdmin = ['admin', 'super_admin'].includes(scope.user.role);
        if (message.sender.toString() !== currentUserId.toString() && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized to delete this message" }, { status: 403 });
        }

        // Soft delete: keep the record but set deletedAt
        message.deletedAt = new Date();
        // Also clear the text to be safe, or we can keep it and handle it in frontend
        // User said: "it should show this message was deleted"
        // So we keep the record but mark it.
        await message.save();

        // Broadcast the deletion via Pusher
        const channelName = `presence-conversation-${message.conversationId}`;
        await pusherServer.trigger(channelName, 'message-deleted', {
            messageId: id,
            conversationId: message.conversationId
        });

        return NextResponse.json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/chat/messages/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }
}
