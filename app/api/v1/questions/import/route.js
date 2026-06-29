import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";

const ALLOWED_TYPES = ['mcq', 'true_false', 'short_answer', 'essay'];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

function validateQuestion(q, index) {
    const errors = [];
    const prefix = `Question ${index + 1}`;

    if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
        errors.push(`${prefix}: 'text' is required`);
    }
    if (!q.type || !ALLOWED_TYPES.includes(q.type)) {
        errors.push(`${prefix}: 'type' must be one of: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (!q.correctAnswer && q.correctAnswer !== 0 && q.correctAnswer !== false) {
        errors.push(`${prefix}: 'correctAnswer' is required`);
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
    } else if (q.type === 'true_false') {
        const val = String(q.correctAnswer).toLowerCase();
        if (val !== 'true' && val !== 'false') {
            errors.push(`${prefix}: True/False correctAnswer must be 'true' or 'false'`);
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
                } else if (q.type === 'true_false') {
                    correctAnswer = String(q.correctAnswer).toLowerCase();
                } else {
                    correctAnswer = String(q.correctAnswer).trim();
                }

                validQuestions.push({
                    text: q.text.trim(),
                    type: q.type,
                    difficulty: q.difficulty || 'medium',
                    options: Array.isArray(q.options) ? q.options : [],
                    correctAnswer,
                    marks: Number(q.marks ?? 1),
                    explanation: q.explanation || '',
                    tags: Array.isArray(q.tags) ? q.tags : [],
                    subject: subjectId || q.subject || null,
                    classLevel: q.classLevel || null,
                    course: courseId || q.course || null,
                    batch: batchId || q.batch || null,
                    institute: scope.instituteId,
                    createdBy: session.user.id,
                    isActive: true,
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
