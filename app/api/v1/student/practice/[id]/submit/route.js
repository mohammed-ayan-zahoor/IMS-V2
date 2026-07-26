import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PracticeSession from "@/models/PracticeSession";
import { ObjectId } from "mongodb";

/**
 * @route   PATCH /api/v1/student/practice/[id]/submit
 * @desc    Save results of a completed practice session
 */
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams?.id;

        const body = await req.json();
        const { answers, score, correctCount } = body;

        await connectDB();

        let sessionObjectId = id;
        if (ObjectId.isValid(id)) {
            sessionObjectId = new ObjectId(id);
        }

        const query = {
            $or: [
                { _id: id },
                { _id: sessionObjectId }
            ]
        };
        
        const practiceSession = await PracticeSession.findOneAndUpdate(
            query,
            {
                ...(answers && answers.length > 0 ? { questions: answers } : {}),
                score: Number(score ?? 0),
                correctCount: Number(correctCount ?? 0),
                status: 'completed',
                endTime: new Date()
            },
            { new: true }
        );

        if (!practiceSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Practice saved", session: practiceSession });
    } catch (error) {
        console.error("Practice submit error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
