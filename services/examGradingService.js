import Exam from '@/models/Exam';
import ExamSubmission from '@/models/ExamSubmission';
import { createAuditLog } from './auditService';

export class ExamGradingService {
    /**
     * Auto-grade MCQ and True/False questions
     */
    static async autoGrade(submissionId, actorId = null) {
        const submission = await ExamSubmission.findById(submissionId)
            .populate({
                path: 'exam',
                populate: { path: 'questions' }
            })
            .populate('student');

        if (!submission) {
            throw new Error('Submission not found');
        }

        const exam = submission.exam;
        let totalScore = 0;
        let needsManualReview = false;

        for (let i = 0; i < submission.answers.length; i++) {
            const answer = submission.answers[i];
            const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());

            if (!question) continue;

            if (question.type === 'mcq' || question.type === 'true_false') {
                // Auto-grade objective questions
                // NOTE: answer.answer is stored as string.
                // For MCQ: correctAnswer is stored as string "0", "1", "2", etc.

                // Check if answer matches
                const studentAnswer = String(answer.answer);
                const isCorrect = studentAnswer === question.correctAnswer;

                answer.isCorrect = isCorrect;

                if (isCorrect) {
                    answer.marksAwarded = question.marks;
                } else {
                    // Apply negative marking if configured
                    if (exam.negativeMarking && answer.answer !== undefined && answer.answer !== '') { // Only if attempted
                        answer.marksAwarded = -(question.marks * (exam.negativeMarkingPercentage || 0) / 100);
                    } else {
                        answer.marksAwarded = 0;
                    }
                }

                totalScore += answer.marksAwarded;
            } else if (question.type === 'descriptive') { // Updated from 'short_answer' to match Exam.js enum
                // Flag for manual review
                needsManualReview = true;
                answer.marksAwarded = 0; // Default until graded
            }
        }

        // Update submission
        submission.score = totalScore;
        submission.percentage = (totalScore / exam.totalMarks) * 100;
        submission.status = needsManualReview ? 'submitted' : 'evaluated';
        submission.submittedAt = submission.submittedAt || new Date();

        if (!needsManualReview) {
            submission.evaluatedBy = actorId;
            submission.evaluatedAt = new Date();
        }

        await submission.save();

        // Log grading action
        if (actorId) {
            await createAuditLog({
                actor: actorId,
                action: 'exam.auto_grade',
                resource: 'ExamSubmission', // Corrected resource format for existing audit service if needed, usually string or object
                resourceId: submission._id, // Providing ID separately if audit service expects it
                institute: exam.institute,
                details: {
                    studentName: submission.student.fullName,
                    examTitle: exam.title,
                    score: totalScore,
                    needsManualReview
                }
            });
        }

        return {
            submission,
            totalScore,
            percentage: submission.percentage,
            needsManualReview
        };
    }

    /**
     * Manually grade a specific answer
     */
    static async gradeAnswer(submissionId, questionId, marksAwarded, feedback, graderId) {
        const submission = await ExamSubmission.findById(submissionId)
            .populate('exam student');

        if (!submission) {
            throw new Error('Submission not found');
        }

        // Find the answer
        const answer = submission.answers.find(
            a => a.questionId.toString() === questionId
        );

        if (!answer) {
            throw new Error('Answer not found');
        }

        const question = submission.exam.questions.id(questionId);

        // Validate marks
        if (marksAwarded < 0 || marksAwarded > question.marks) {
            throw new Error(`Marks must be between 0 and ${question.marks}`);
        }

        // Update answer
        answer.marksAwarded = marksAwarded;
        answer.feedback = feedback;
        answer.gradedBy = graderId;
        answer.gradedAt = new Date();

        // Recalculate total score
        submission.score = submission.answers.reduce(
            (sum, a) => sum + (a.marksAwarded || 0),
            0
        );
        submission.percentage = (submission.score / submission.exam.totalMarks) * 100;

        // Check if all answers are graded
        const allGraded = submission.answers.every(a => a.gradedBy || a.marksAwarded !== undefined); // Simplified check

        if (allGraded && submission.status === 'submitted') {
            submission.status = 'evaluated';
            submission.evaluatedBy = graderId;
            submission.evaluatedAt = new Date();
        }

        await submission.save();

        // Log manual grading
        await createAuditLog({
            actor: graderId,
            action: 'exam.manual_grade',
            resource: 'ExamSubmission',
            resourceId: submission._id,
            institute: submission.exam.institute,
            details: {
                studentName: submission.student.fullName,
                examTitle: submission.exam.title,
                questionId,
                marksAwarded,
                totalScore: submission.score
            }
        });

        return submission;
    }

    /**
     * Bulk grade multiple submissions (e.g., same answer for all)
     */
    static async bulkGrade(submissionIds, questionId, marksAwarded, feedback, graderId) {
        const results = [];

        for (const submissionId of submissionIds) {
            try {
                const submission = await this.gradeAnswer(
                    submissionId,
                    questionId,
                    marksAwarded,
                    feedback,
                    graderId
                );
                results.push({ submissionId, success: true, submission });
            } catch (error) {
                results.push({ submissionId, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get grading statistics for an exam
     */
    static async getGradingStats(examId) {
        const submissions = await ExamSubmission.find({ exam: examId })
            .populate('student');

        const total = submissions.length;
        const evaluated = submissions.filter(s => s.status === 'evaluated').length;
        const needsGrading = submissions.filter(s => s.status === 'submitted').length;
        const inProgress = submissions.filter(s => s.status === 'in_progress').length;
        const flagged = submissions.filter(s => s.flaggedForReview).length;

        const scores = submissions
            .filter(s => s.status === 'evaluated')
            .map(s => s.score);

        const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const minScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
            total,
            evaluated,
            needsGrading,
            inProgress,
            flagged,
            avgScore: Math.round(avgScore * 100) / 100,
            maxScore,
            minScore,
            passRate: scores.length > 0
                ? (scores.filter(s => s >= (submissions[0]?.exam?.passingMarks || 0)).length / scores.length * 100)
                : 0
        };
    }
}
