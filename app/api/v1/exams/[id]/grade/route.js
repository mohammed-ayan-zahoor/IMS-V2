import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamSubmission from "@/models/ExamSubmission";
import Question from "@/models/Question";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import mongoose from "mongoose";

const SUBJECTIVE_TYPES = ['short_answer', 'essay'];

// GET /api/v1/exams/[id]/grade
// Returns all submissions for the exam grouped by question, filtered to the
// calling instructor's assigned subjects. Admins see all.
export async function GET(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const exam = await Exam.findById(id)
            .populate('questions')
            .populate('evaluatorAssignments.subject', 'name')
            .populate('evaluatorAssignments.evaluator', 'profile.firstName profile.lastName');

        if (!exam || exam.deletedAt) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        const hasAccess = await validateInstituteAccess(exam, scope);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Determine which questions this user can grade
        const isAdmin = ["admin", "super_admin"].includes(scope.user.role);
        let gradableSubjectIds = null;
        if (!isAdmin) {
            const myAssignments = (exam.evaluatorAssignments || []).filter(
                a => String(a.evaluator?._id || a.evaluator) === String(scope.user._id)
            );
            if (myAssignments.length === 0) {
                return NextResponse.json({ error: "You are not assigned as an evaluator for this exam" }, { status: 403 });
            }
            gradableSubjectIds = myAssignments.map(a => String(a.subject?._id || a.subject || ""));
        }

        // Get only subjective questions (those needing manual grading)
        const subjectiveQs = exam.questions.filter(q => SUBJECTIVE_TYPES.includes(q.type));
        const examSubId = String(exam.subject?._id || exam.subject || "");

        const filteredQs = isAdmin
            ? subjectiveQs
            : subjectiveQs.filter(q => {
                const qSubId = String(q.subject?._id || q.subject || examSubId || "");
                return gradableSubjectIds.includes(qSubId) || gradableSubjectIds.includes("");
            });

        if (filteredQs.length === 0) {
            return NextResponse.json({ questions: [], totalSubmissions: 0 });
        }

        const qIds = filteredQs.map(q => q._id);

        const submissions = await ExamSubmission.find({ exam: id, status: { $ne: 'in_progress' } })
            .populate('student', 'profile.firstName profile.lastName studentId')
            .select('student answers gradingStatus score percentage status');

        // Build: for each question, return list of student answers
        const grouped = filteredQs.map(q => ({
            question: {
                _id:         q._id,
                text:        q.text,
                type:        q.type,
                marks:       q.marks,
                modelAnswer:   q.modelAnswer,
                rubric:        q.rubric,
                chapter:       q.chapter,
                topic:         q.topic,
                snippet:       q.snippet,
                questionImage: q.questionImage
            },
            answers: submissions.map(sub => {
                const ans = sub.answers.find(a => String(a.questionId) === String(q._id));
                return {
                    submissionId: sub._id,
                    student:      sub.student,
                    answer:       ans?.answer || null,
                    marksAwarded: ans?.marksAwarded ?? null,
                    feedback:     ans?.feedback || '',
                    gradedBy:     ans?.gradedBy || null,
                    gradedAt:     ans?.gradedAt || null,
                    needsGrading: ans?.needsGrading ?? true,
                    attempted:    !!ans?.answer
                };
            })
        }));

        const totalPending = submissions.filter(s => s.gradingStatus === 'pending' || s.gradingStatus === 'in_progress').length;

        return NextResponse.json({
            examTitle:        exam.title,
            questions:        grouped,
            totalSubmissions: submissions.length,
            totalPending,
            evaluatorAssignments: exam.evaluatorAssignments
        });

    } catch (error) {
        console.error('Grade GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/v1/exams/[id]/grade
// Body: { submissionId, questionId, marksAwarded, feedback }
// Saves the grade for one answer. Recalculates total score.
// Sets gradingStatus to 'completed' when all needsGrading answers are done.
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const scope   = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const { submissionId, questionId, marksAwarded, feedback } = await req.json();

        if (!submissionId || !questionId || marksAwarded === undefined) {
            return NextResponse.json({ error: "submissionId, questionId, and marksAwarded are required" }, { status: 400 });
        }

        const exam = await Exam.findById(id).populate('questions', 'marks type');
        if (!exam || exam.deletedAt) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        const hasAccess = await validateInstituteAccess(exam, scope);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Clamp marks to the question's max
        const question = exam.questions.find(q => String(q._id) === String(questionId));
        if (!question) return NextResponse.json({ error: "Question not found in this exam" }, { status: 404 });
        const clampedMarks = Math.min(Math.max(0, Number(marksAwarded)), question.marks);

        const submission = await ExamSubmission.findById(submissionId);
        if (!submission || String(submission.exam) !== String(id)) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        // Update the specific answer
        const ansIdx = submission.answers.findIndex(a => String(a.questionId) === String(questionId));
        if (ansIdx === -1) return NextResponse.json({ error: "Answer not found in submission" }, { status: 404 });

        submission.answers[ansIdx].marksAwarded  = clampedMarks;
        submission.answers[ansIdx].feedback       = feedback || '';
        submission.answers[ansIdx].gradedBy       = session.user.id;
        submission.answers[ansIdx].gradedAt       = new Date();
        submission.answers[ansIdx].needsGrading   = false;

        // Recalculate total score (auto-graded marks already set + all manually graded so far)
        const totalScore = submission.answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
        submission.score       = totalScore;
        submission.percentage  = exam.totalMarks > 0 ? Math.round((totalScore / exam.totalMarks) * 100) : 0;

        // Update manualMarksTotal
        const manualTotal = submission.answers
            .filter(a => SUBJECTIVE_TYPES.includes(
                exam.questions.find(q => String(q._id) === String(a.questionId))?.type
            ))
            .reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
        submission.manualMarksTotal = manualTotal;

        // Auto-complete grading when all needsGrading answers are resolved
        const stillPending = submission.answers.some(a => a.needsGrading === true);
        submission.gradingStatus = stillPending ? 'in_progress' : 'completed';
        if (!stillPending) {
            submission.evaluatedBy = session.user.id;
            submission.evaluatedAt = new Date();
            submission.status      = 'evaluated';
        }

        await submission.save();
        return NextResponse.json({ success: true, score: submission.score, percentage: submission.percentage, gradingStatus: submission.gradingStatus });

    } catch (error) {
        console.error('Grade PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
