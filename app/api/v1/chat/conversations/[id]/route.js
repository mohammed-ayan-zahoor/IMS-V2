import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
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

        const conversation = await Conversation.findOne({
            _id: id,
            institute: scope.instituteId
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        // Only participants can delete their view of the conversation?
        // Or hard delete for everyone?
        // User said: "if deleted it should vanish from the students page too"
        // This implies a hard delete or global soft delete.
        // Let's do global soft delete.
        
        // Check if user is participant
        const isParticipant = conversation.participants.some(p => p.toString() === currentUserId.toString());
        const isAdmin = ['admin', 'super_admin'].includes(scope.user.role);

        if (!isParticipant && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        conversation.deletedAt = new Date();
        await conversation.save();

        // Optional: Soft delete all messages in this conversation too
        await Message.updateMany(
            { conversationId: id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );

        // Broadcast to all participants that the conversation is gone
        for (const participantId of conversation.participants) {
            const userChannel = `user-updates-${participantId}`;
            await pusherServer.trigger(userChannel, 'conversation-deleted', {
                conversationId: id
            });
        }

        return NextResponse.json({ message: "Chat deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/chat/conversations/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
