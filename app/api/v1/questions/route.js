import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import User from "@/models/User"; // Ensure registered

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();

        const question = await Question.create({
            ...data,
            createdBy: session.user.id
        });

        return Response.json(question, { status: 201 });
    } catch (error) {
        console.error("Create Question Error:", error);
        return Response.json({ error: "Failed to create question" }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const course = searchParams.get('course');
        const batch = searchParams.get('batch');
        const type = searchParams.get('type');
        const difficulty = searchParams.get('difficulty');
        const createdBy = searchParams.get('createdBy'); // "my questions"

        const query = { deletedAt: null };
        if (course) query.course = course;
        if (batch) query.batch = batch;
        if (type) query.type = type;
        if (difficulty) query.difficulty = difficulty;
        if (createdBy === 'me') query.createdBy = session.user.id;

        await connectDB();

        const questions = await Question.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name')
            .populate('course', 'name code')
            .populate('batch', 'name');

        return Response.json({ questions });
    } catch (error) {
        console.error("Fetch Questions Error:", error);
        return Response.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}
