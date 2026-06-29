import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PracticeSession from "@/models/PracticeSession";

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

        const { id } = params;
        const { answers, score, correctCount } = await req.json();

        await connectDB();
        
        const practiceSession = await PracticeSession.findOneAndUpdate(
            { _id: id, student: session.user.id },
            {
                questions: answers,
                score,
                correctCount,
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
