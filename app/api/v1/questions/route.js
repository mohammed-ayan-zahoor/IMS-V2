import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";

const ALLOWED_TYPES = ['mcq', 'true_false', 'short_answer', 'essay'];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has permission (admin/super_admin usually, maybe instructor)
        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const subject = searchParams.get('subject');
        const difficulty = searchParams.get('difficulty');
        const type = searchParams.get('type');

        const filter = { isActive: true, institute: scope.instituteId };

        // Validate and apply filters
        if (subject) {
            filter.subject = subject; // Subject is free text but we could sanitize if needed
        }

        if (difficulty) {
            if (ALLOWED_DIFFICULTIES.includes(difficulty)) {
                filter.difficulty = difficulty;
            }
            // Else ignore invalid difficulty or return 400? 
            // "only add to filter when valid, and otherwise ignore" per instructions
        }

        if (type) {
            if (ALLOWED_TYPES.includes(type)) {
                filter.type = type;
            }
        }

        const questions = await Question.find(filter)
            .populate('createdBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ questions });

    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        const body = await req.json();

        // Input Validation
        const requiredFields = ['text', 'type', 'subject', 'classLevel', 'difficulty', 'correctAnswer', 'marks'];
        const missing = requiredFields.filter(field => !body[field]);
        if (missing.length > 0) {
            return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
        }

        // Enum Validation
        if (!ALLOWED_TYPES.includes(body.type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        if (!ALLOWED_DIFFICULTIES.includes(body.difficulty)) {
            return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
        }

        // Marks Validation
        const marks = Number(body.marks);
        if (isNaN(marks) || marks <= 0) {
            return NextResponse.json({ error: "Marks must be a positive number" }, { status: 400 });
        }

        // Answer Validation
        let validatedAnswer = body.correctAnswer;
        if (body.type === 'mcq') {
            const index = Number(body.correctAnswer);
            // Options must allow array check
            const opts = Array.isArray(body.options) ? body.options : [];
            if (opts.length < 2) {
                return NextResponse.json({ error: "MCQ must have at least 2 options" }, { status: 400 });
            }
            if (isNaN(index) || index < 0 || index >= opts.length) {
                return NextResponse.json({ error: "MCQ answer must be a valid option index" }, { status: 400 });
            }
            validatedAnswer = String(index);
        } else if (body.type === 'true_false') {
            const val = String(body.correctAnswer).toLowerCase();
            if (val !== 'true' && val !== 'false') {
                return NextResponse.json({ error: "True/False answer must be 'true' or 'false'" }, { status: 400 });
            }
            validatedAnswer = val;
        } else if (['short_answer', 'essay'].includes(body.type)) {
            if (!body.correctAnswer || typeof body.correctAnswer !== 'string' || !body.correctAnswer.trim()) {
                return NextResponse.json({ error: "Correct answer text is required" }, { status: 400 });
            }
            validatedAnswer = body.correctAnswer.trim();
        }

        // Whitelist sanitation
        const safeData = {
            text: body.text,
            type: body.type,
            subject: body.subject,
            classLevel: body.classLevel,
            difficulty: body.difficulty,
            options: Array.isArray(body.options) ? body.options : [],
            correctAnswer: validatedAnswer,
            marks: marks,
            explanation: body.explanation,
            tags: Array.isArray(body.tags) ? body.tags : [],
            institute: scope.instituteId,
            createdBy: session.user.id
            // isActive defaults to true in schema
        };

        const question = await Question.create(safeData);

        return NextResponse.json({ question }, { status: 201 });

    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }
}
