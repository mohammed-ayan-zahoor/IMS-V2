import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";

const ALLOWED_TYPES = [
    'mcq', 'multi_correct_mcq', 'true_false', 'fill_in_blank',
    'short_answer', 'essay', 'numerical', 'match_the_following'
];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];
const ALLOWED_STATUSES = ['draft', 'approved'];

function isValidObjectId(id) {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(String(id));
}

function validateQuestion(q, index) {
    const errors = [];
    const prefix = `Question ${index + 1}`;

    if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
        errors.push(`${prefix}: 'text' is required`);
    }
    if (!q.type || !ALLOWED_TYPES.includes(q.type)) {
        errors.push(`${prefix}: 'type' must be one of: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') {
        // short_answer & essay can have optional modelAnswer instead of strict correctAnswer
        if (!['short_answer', 'essay'].includes(q.type)) {
            errors.push(`${prefix}: 'correctAnswer' is required`);
        }
    }

    const difficulty = q.difficulty || 'medium';
    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
        errors.push(`${prefix}: 'difficulty' must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}`);
    }

    const marks = Number(q.marks ?? 1);
    if (isNaN(marks) || marks <= 0) {
        errors.push(`${prefix}: 'marks' must be a positive number`);
    }

    // Type-specific validation
    if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            errors.push(`${prefix}: MCQ must have at least 2 options`);
        } else {
            const idx = Number(q.correctAnswer);
            if (isNaN(idx) || idx < 0 || idx >= q.options.length) {
                errors.push(`${prefix}: MCQ correctAnswer must be a valid option index (0-${q.options.length - 1})`);
            }
        }
    } else if (q.type === 'multi_correct_mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            errors.push(`${prefix}: Multi-Correct MCQ must have at least 2 options`);
        } else {
            let indices = q.correctAnswer;
            if (typeof indices === 'string') {
                try { indices = JSON.parse(indices); } catch { indices = null; }
            }
            if (!Array.isArray(indices) || indices.length === 0 || indices.some(i => isNaN(Number(i)) || Number(i) < 0 || Number(i) >= q.options.length)) {
                errors.push(`${prefix}: multi_correct_mcq correctAnswer must be an array of valid option indices (e.g. [0, 2])`);
            }
        }
    } else if (q.type === 'true_false') {
        const val = String(q.correctAnswer).toLowerCase();
        if (val !== 'true' && val !== 'false') {
            errors.push(`${prefix}: True/False correctAnswer must be 'true' or 'false'`);
        }
    } else if (q.type === 'numerical') {
        if (isNaN(Number(q.correctAnswer))) {
            errors.push(`${prefix}: Numerical correctAnswer must be a number`);
        }
    }

    return errors;
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

        const { questions: rawQuestions, courseId, batchId, subjectId } = body;

        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
            return NextResponse.json({ 
                error: "Request must contain a 'questions' array with at least one question" 
            }, { status: 400 });
        }

        if (rawQuestions.length > 500) {
            return NextResponse.json({ 
                error: "Maximum 500 questions per import" 
            }, { status: 400 });
        }

        // Validate all questions first
        const allErrors = [];
        const validQuestions = [];

        for (let i = 0; i < rawQuestions.length; i++) {
            const q = rawQuestions[i];
            const errors = validateQuestion(q, i);

            if (errors.length > 0) {
                allErrors.push({ index: i, errors });
            } else {
                // Normalize and sanitize
                let correctAnswer = q.correctAnswer;
                if (q.type === 'mcq') {
                    correctAnswer = String(Number(q.correctAnswer));
                } else if (q.type === 'multi_correct_mcq') {
                    const indices = Array.isArray(q.correctAnswer)
                        ? q.correctAnswer.map(Number)
                        : (typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : []);
                    correctAnswer = JSON.stringify(indices);
                } else if (q.type === 'true_false') {
                    correctAnswer = String(q.correctAnswer).toLowerCase();
                } else if (q.type === 'match_the_following') {
                    correctAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer || q.matchPairs || []);
                } else {
                    correctAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer).trim() : (q.modelAnswer || '');
                }

                const finalSubject = subjectId || q.subject;
                const finalCourse  = courseId  || q.course;
                const finalBatch   = batchId   || q.batch;

                validQuestions.push({
                    text:         q.text.trim(),
                    type:         q.type,
                    difficulty:   q.difficulty || 'medium',
                    options:      Array.isArray(q.options) ? q.options : [],
                    correctAnswer,
                    marks:        Number(q.marks ?? 1),
                    explanation:  q.explanation || '',
                    tags:         Array.isArray(q.tags) ? q.tags : [],
                    subject:      isValidObjectId(finalSubject) ? finalSubject : null,
                    classLevel:   q.classLevel || null,
                    course:       isValidObjectId(finalCourse)  ? finalCourse  : null,
                    batch:        isValidObjectId(finalBatch)   ? finalBatch   : null,
                    chapter:      q.chapter  ? String(q.chapter).trim()  : undefined,
                    topic:        q.topic    ? String(q.topic).trim()    : undefined,
                    syllabus:     q.syllabus ? String(q.syllabus).trim() : undefined,
                    bloomsLevel:  q.bloomsLevel || undefined,
                    estimatedTimeSeconds: q.estimatedTimeSeconds ? Number(q.estimatedTimeSeconds) : undefined,
                    modelAnswer:  q.modelAnswer ? String(q.modelAnswer).trim() : undefined,
                    rubric:       q.rubric      ? String(q.rubric).trim()      : undefined,
                    status:       ALLOWED_STATUSES.includes(q.status) ? q.status : 'draft',
                    institute:    scope.instituteId,
                    createdBy:    session.user.id,
                    isActive:     true,
                });
            }
        }

        // Insert valid questions
        let inserted = [];
        if (validQuestions.length > 0) {
            inserted = await Question.insertMany(validQuestions, { ordered: false });
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: rawQuestions.length,
                imported: inserted.length,
                failed: allErrors.length,
            },
            errors: allErrors.length > 0 ? allErrors : undefined,
        }, { status: 201 });

    } catch (error) {
        console.error('Error importing questions:', error);
        return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 });
    }
}
