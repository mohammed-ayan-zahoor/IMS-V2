import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";
import mongoose from "mongoose";

const ALLOWED_TYPES = [
    'mcq', 'multi_correct_mcq', 'true_false', 'fill_in_blank',
    'short_answer', 'essay', 'numerical', 'match_the_following'
];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];
const ALLOWED_STATUSES = ['draft', 'approved'];

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const subject     = searchParams.get('subject');
        const difficulty  = searchParams.get('difficulty');
        const type        = searchParams.get('type');
        const course      = searchParams.get('course');
        const batch       = searchParams.get('batch');
        const search      = searchParams.get('search');
        const chapter     = searchParams.get('chapter');
        const topic       = searchParams.get('topic');
        const syllabus    = searchParams.get('syllabus');
        const bloomsLevel = searchParams.get('bloomsLevel');
        const status      = searchParams.get('status');

        const filter = { isActive: true, institute: scope.instituteId };

        if (subject)    filter.subject  = subject;
        if (chapter)    filter.chapter  = { $regex: `^${chapter}$`,  $options: 'i' };
        if (topic)      filter.topic    = { $regex: `^${topic}$`,    $options: 'i' };
        if (syllabus)   filter.syllabus = { $regex: `^${syllabus}$`, $options: 'i' };
        if (difficulty && ALLOWED_DIFFICULTIES.includes(difficulty)) filter.difficulty = difficulty;
        if (type && ALLOWED_TYPES.includes(type)) filter.type = type;
        if (bloomsLevel) filter.bloomsLevel = bloomsLevel;
        if (status && ALLOWED_STATUSES.includes(status)) filter.status = status;

        if (course && mongoose.Types.ObjectId.isValid(course)) {
            filter.course = new mongoose.Types.ObjectId(course);
        }
        if (batch && mongoose.Types.ObjectId.isValid(batch)) {
            filter.batch = new mongoose.Types.ObjectId(batch);
        }
        if (search) {
            filter.$or = [
                { text:    { $regex: search, $options: 'i' } },
                { chapter: { $regex: search, $options: 'i' } },
                { topic:   { $regex: search, $options: 'i' } }
            ];
        }

        const page  = Math.max(1, parseInt(searchParams.get('page'))  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
        const skip  = (page - 1) * limit;

        const [questions, total] = await Promise.all([
            Question.find(filter)
                .populate('createdBy', 'profile.firstName profile.lastName')
                .populate('course', 'name')
                .populate('batch',  'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Question.countDocuments(filter)
        ]);

        return NextResponse.json({
            questions,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });

    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        const body = await req.json();

        const requiredFields = ['text', 'type', 'difficulty', 'correctAnswer', 'marks'];
        const missing = requiredFields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
        if (missing.length > 0) {
            return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(body.type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        if (!ALLOWED_DIFFICULTIES.includes(body.difficulty)) {
            return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
        }

        const marks = Number(body.marks);
        if (isNaN(marks) || marks <= 0) {
            return NextResponse.json({ error: "Marks must be a positive number" }, { status: 400 });
        }

        if (body.course && !mongoose.Types.ObjectId.isValid(body.course)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }
        if (body.batch && !mongoose.Types.ObjectId.isValid(body.batch)) {
            return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
        }

        let validatedAnswer = body.correctAnswer;
        if (body.type === 'mcq') {
            const opts = Array.isArray(body.options) ? body.options : [];
            if (opts.length < 2) return NextResponse.json({ error: "MCQ must have at least 2 options" }, { status: 400 });
            const idx = Number(body.correctAnswer);
            if (isNaN(idx) || idx < 0 || idx >= opts.length) {
                return NextResponse.json({ error: "MCQ answer must be a valid option index" }, { status: 400 });
            }
            validatedAnswer = String(idx);
        } else if (body.type === 'true_false') {
            const val = String(body.correctAnswer).toLowerCase();
            if (val !== 'true' && val !== 'false') {
                return NextResponse.json({ error: "True/False answer must be 'true' or 'false'" }, { status: 400 });
            }
            validatedAnswer = val;
        } else if (body.type === 'multi_correct_mcq') {
            const opts = Array.isArray(body.options) ? body.options : [];
            if (opts.length < 2) return NextResponse.json({ error: "MCQ must have at least 2 options" }, { status: 400 });
            try {
                const indices = JSON.parse(body.correctAnswer);
                if (!Array.isArray(indices) || indices.some(i => i < 0 || i >= opts.length)) {
                    return NextResponse.json({ error: "Invalid multi-correct answer indices" }, { status: 400 });
                }
            } catch {
                return NextResponse.json({ error: "multi_correct_mcq correctAnswer must be a JSON array" }, { status: 400 });
            }
        } else if (body.type === 'numerical') {
            if (isNaN(Number(body.correctAnswer))) {
                return NextResponse.json({ error: "Numerical answer must be a number" }, { status: 400 });
            }
        }

        const safeData = {
            text:         body.text,
            type:         body.type,
            subject:      body.subject    || null,
            classLevel:   body.classLevel || undefined,
            syllabus:     body.syllabus   || undefined,
            chapter:      body.chapter    || undefined,
            topic:        body.topic      || undefined,
            course:       body.course     || null,
            batch:        body.batch      || null,
            difficulty:   body.difficulty,
            options:      Array.isArray(body.options) ? body.options : [],
            correctAnswer: validatedAnswer,
            marks,
            explanation:  body.explanation || undefined,
            bloomsLevel:  body.bloomsLevel || undefined,
            estimatedTimeSeconds: body.estimatedTimeSeconds || undefined,
            questionImage: body.questionImage || undefined,
            modelAnswer:  body.modelAnswer   || undefined,
            rubric:       body.rubric        || undefined,
            status:       ALLOWED_STATUSES.includes(body.status) ? body.status : 'draft',
            tags:         Array.isArray(body.tags) ? body.tags : [],
            institute:    scope.instituteId,
            createdBy:    session.user.id
        };

        const question = await Question.create(safeData);
        return NextResponse.json({ question }, { status: 201 });

    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }
}
