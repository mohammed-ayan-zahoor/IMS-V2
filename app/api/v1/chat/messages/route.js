import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { getInstituteScope } from "@/middleware/instituteScope";
import { getPusherInstance, getBeamsInstance } from "@/lib/pusher";
import User from "@/models/User";
const ADMIN_ROLES = ['admin', 'super_admin'];

async function getRecipientRoles(userIds) {
    const users = await User.find({ _id: { $in: userIds } }, 'role');
    const roleMap = {};
    for (const user of users) {
        roleMap[user._id.toString()] = user.role;
    }
    return roleMap;
}

function buildPayload({ chatTitle, text, isBatch, senderName, role }) {
    const bodyText = isBatch ? `${senderName}: ${text}` : text;
    return {
        apns: {
            aps: {
                alert: {
                    title: chatTitle,
                    body: bodyText
                },
                sound: "default"
            }
        },
        fcm: {
            notification: {
                title: chatTitle,
                body: bodyText
            }
        },
        web: {
            notification: {
                title: chatTitle,
                body: bodyText,
                deep_link: role === 'admin' ? '/admin/chat' : '/chat'
            }
        }
    };
}
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
            conversationId
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
        }        // Trigger Pusher Event dynamically
        const pusher = await getPusherInstance(scope.instituteId);
        const channelName = `presence-conversation-${conversationId}`;
        await pusher.trigger(channelName, 'new-message', newMessage.toObject());

        const recipientIds = conversation.participants
            .map(p => p.toString())
            .filter(id => id !== currentUserId.toString());

        const beamsClient = await getBeamsInstance(scope.instituteId);
        if (recipientIds.length > 0 && beamsClient) {
            try {
                // Get roles for all recipients
                const roleMap = await getRecipientRoles(recipientIds);
                
                // Partition IDs by role
                const adminIds = [];
                const studentIds = [];
                
                for (const recipientId of recipientIds) {
                    const role = roleMap[recipientId];
                    if (ADMIN_ROLES.includes(role)) {
                        adminIds.push(recipientId);
                    } else {
                        studentIds.push(recipientId);
                    }
                }
                
                // Extract data needed for payloads
                const senderName = newMessage.sender?.profile?.firstName || 'Someone';
                const isBatch = conversation.type === 'batch';
                const chatTitle = isBatch ? (conversation.batch?.name || 'Group Chat') : senderName;
                
                // Send notifications to admins
                if (adminIds.length > 0) {
                    await beamsClient.publishToUsers(adminIds, buildPayload({
                        chatTitle,
                        text,
                        isBatch,
                        senderName,
                        role: 'admin' // any admin role works
                    }));
                }
                
                // Send notifications to students
                if (studentIds.length > 0) {
                    await beamsClient.publishToUsers(studentIds, buildPayload({
                        chatTitle,
                        text,
                        isBatch,
                        senderName,
                        role: 'student' // non-admin role
                    }));
                }
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