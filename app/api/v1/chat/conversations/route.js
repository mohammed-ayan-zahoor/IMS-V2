import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Batch from "@/models/Batch";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUserId = scope.user.id;

        // Find all conversations where the current user is a participant and match the institute
        const conversations = await Conversation.find({
            institute: scope.instituteId,
            participants: currentUserId,
            deletedAt: null
        })
            .populate('participants', 'profile.firstName profile.lastName email role')
            .populate({
                path: 'lastMessage',
                select: 'text createdAt sender readBy'
            })
            .populate('batch', 'name')
            .sort({ lastMessageAt: -1 });

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("GET /api/v1/chat/conversations error:", error);
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }
}

// Create a new direct conversation
export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !scope.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { targetUserId, isBatch, batchId } = body;
        const currentUserId = scope.user.id;

        if (isBatch) {
            if (!batchId) {
                return NextResponse.json({ error: "Missing batch ID" }, { status: 400 });
            }

            // Check if batch conversation exists within this institute
            let conversation = await Conversation.findOne({
                institute: scope.instituteId,
                type: 'batch',
                batch: batchId,
                deletedAt: null
            });

            if (conversation) {
                // Ensure current user is in the participants list
                if (!conversation.participants.includes(currentUserId)) {
                    conversation.participants.push(currentUserId);
                    await conversation.save();
                }
                return NextResponse.json({ conversation }, { status: 200 });
            }

            // Create new batch conversation
            const batchDoc = await Batch.findById(batchId);
            if (!batchDoc) {
                return NextResponse.json({ error: "Batch not found" }, { status: 404 });
            }

            let participantIds = [currentUserId];
            // Add enrolled students
            if (batchDoc.enrolledStudents && batchDoc.enrolledStudents.length > 0) {
                const studentIds = batchDoc.enrolledStudents
                    .filter(enrollment => enrollment.status === 'active')
                    .map(enrollment => enrollment.student.toString());
                participantIds = [...new Set([...participantIds, ...studentIds])];
            }

            // Add instructor if there is one
            if (batchDoc.instructor) {
                participantIds.push(batchDoc.instructor.toString());
                participantIds = [...new Set(participantIds)];
            }

            conversation = await Conversation.create({
                institute: scope.instituteId,
                type: 'batch',
                batch: batchId,
                participants: participantIds,
            });

            return NextResponse.json({ conversation }, { status: 201 });
        }

        if (!targetUserId) {
            return NextResponse.json({ error: "Missing target user" }, { status: 400 });
        }

        // Check if conversation already exists within this institute
        let conversation = await Conversation.findOne({
            institute: scope.instituteId,
            type: 'direct',
            participants: { $all: [currentUserId, targetUserId] },
            deletedAt: null
        });

        if (conversation) {
            return NextResponse.json({ conversation });
        }

        // Create new conversation
        conversation = await Conversation.create({
            institute: scope.instituteId,
            type: 'direct',
            participants: [currentUserId, targetUserId],
        });

        // Trigger pusher event to alert the target user about new conversation
        // we will implement pusher later

        return NextResponse.json({ conversation }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/chat/conversations error:", error);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
}
