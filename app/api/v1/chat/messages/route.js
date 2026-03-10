import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { getInstituteScope } from "@/middleware/instituteScope";
import { pusherServer } from "@/lib/pusher";
import PushNotifications from "@pusher/push-notifications-server";

const beamsClient = new PushNotifications({
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
    secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
        }

        // Ensure user is participant and conversation belongs to current institute
        const conversation = await Conversation.findOne({
            _id: conversationId,
            institute: scope.instituteId
        });
        const participantIds = conversation?.participants?.map(p => p.toString()) || [];
        if (!conversation || !participantIds.includes(scope.user.id.toString())) {
            return NextResponse.json({ error: "Unauthorized or conversation not found" }, { status: 403 });
        }

        const messages = await Message.find({
            conversationId,
            deletedAt: null
        })
            .populate('sender', 'profile.firstName profile.lastName role')
            .populate({
                path: 'replyTo',
                select: 'text sender createdAt',
                strictPopulate: false,
                populate: {
                    path: 'sender',
                    select: 'profile.firstName profile.lastName'
                }
            })
            .sort({ createdAt: 1 }); // Oldest first for chat window

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("GET /api/v1/chat/messages error:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { conversationId, text, replyTo } = body;
        const currentUserId = scope.user.id;

        if (!conversationId || !text) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate conversation & participant and institute
        const conversation = await Conversation.findOne({
            _id: conversationId,
            institute: scope.instituteId
        }).populate('batch', 'name');
        const participantIds = conversation?.participants?.map(p => p.toString()) || [];
        if (!conversation || !participantIds.includes(currentUserId.toString())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Save Message
        const messageData = {
            conversationId,
            sender: currentUserId,
            text,
            readBy: [currentUserId]
        };

        if (replyTo) {
            messageData.replyTo = replyTo;
        }

        const newMessage = await Message.create(messageData);

        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id,
            lastMessageAt: Date.now()
        });

        // Populate sender for realtime broadcast
        await newMessage.populate('sender', 'profile.firstName profile.lastName role');

        if (replyTo) {
            await newMessage.populate({
                path: 'replyTo',
                select: 'text sender createdAt',
                strictPopulate: false,
                populate: {
                    path: 'sender',
                    select: 'profile.firstName profile.lastName'
                }
            });
        }

        // Trigger Pusher Event
        // Channel name combines institute ID and conversation ID to ensure uniqueness
        const channelName = `presence-conversation-${conversationId}`;
        await pusherServer.trigger(channelName, 'new-message', newMessage.toObject());

        const recipientIds = conversation.participants
            .map(p => p.toString())
            .filter(id => id !== currentUserId.toString());

        if (recipientIds.length > 0 && process.env.PUSHER_BEAMS_INSTANCE_ID) {
            const senderName = newMessage.sender?.profile?.firstName || 'Someone';
            const isBatch = conversation.type === 'batch';
            const chatTitle = isBatch ? (conversation.batch?.name || 'Group Chat') : senderName;

            try {
                await beamsClient.publishToUsers(recipientIds, {
                    web: {
                        notification: {
                            title: chatTitle,
                            body: `${isBatch ? senderName + ': ' : ''}${text.substring(0, 100)}`,
                            deep_link: '/admin/chat',
                            icon: '/icon.png',
                        }
                    }
                });
            } catch (beamsErr) {
                // Don't fail the whole request if Beams push fails
                console.warn('Beams push failed:', beamsErr.message);
            }
        }

        return NextResponse.json({ message: newMessage }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/chat/messages error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
