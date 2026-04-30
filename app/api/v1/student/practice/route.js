import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import PracticeSession from "@/models/PracticeSession";
import Subject from "@/models/Subject";

/**
 * @route   GET /api/v1/student/practice
 * @desc    Get student's practice session history
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const sessions = await PracticeSession.find({ student: session.user.id })
            .populate("subject", "name")
            .sort({ createdAt: -1 })
            .limit(20);

        return NextResponse.json({ sessions });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/student/practice
 * @desc    Generate a new practice session
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subjectId, count = 10, difficulty = 'mixed' } = await req.json();
        await connectDB();

        // 1. Build Query for random questions
        const query = { 
            institute: session.user.institute.id,
            subject: subjectId,
            isActive: true,
            deletedAt: null
        };
        if (difficulty !== 'mixed') {
            query.difficulty = difficulty;
        }

        // 2. Sample random questions
        const questions = await Question.aggregate([
            { $match: query },
            { $sample: { size: parseInt(count) } }
        ]);

        if (questions.length === 0) {
            return NextResponse.json({ error: "No questions found for this subject" }, { status: 404 });
        }

        // 3. Create Session
        const practiceSession = await PracticeSession.create({
            student: session.user.id,
            institute: session.user.institute.id,
            subject: subjectId,
            difficulty,
            totalQuestions: questions.length,
            questions: questions.map(q => ({
                question: q._id,
                userAnswer: null,
                isCorrect: null
            }))
        });

        // Return session with question details (we include correctAnswer for instant feedback in practice mode)
        return NextResponse.json({ 
            sessionId: practiceSession._id,
            questions 
        });

    } catch (error) {
        console.error("Practice Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
