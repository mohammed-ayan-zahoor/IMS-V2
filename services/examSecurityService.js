import Exam from '@/models/Exam';
import Batch from '@/models/Batch';
import ExamSubmission from '@/models/ExamSubmission';
import SuspiciousActivity from '@/models/SuspiciousActivity';

export class ExamSecurityService {
    /**
     * Validate if student can access exam
     */
    static async validateExamAccess(examId, studentId) {
        // Fetch exam with populated batches and questions
        const examDoc = await Exam.findById(examId).populate({
            path: 'batches',
            model: 'Batch',
            populate: {
                path: 'enrolledStudents.student',
                model: 'User'
            }
        }).populate("questions");

        if (!examDoc) {
            throw new Error('Exam not found');
        }

        // Check if exam is published
        if (examDoc.status !== 'published') {
            throw new Error('Exam is not published yet');
        }

        // Check if student is enrolled in ANY of the allowed batches
        // enrolledStudents is an array of objects { student: ObjectId, status: 'active', ... }
        let isEnrolled = false;
        if (examDoc.batches && examDoc.batches.length > 0) {
            for (const batch of examDoc.batches) {
                const studentEnrollment = batch.enrolledStudents.find(
                    e => e.student._id.toString() === studentId && e.status === 'active'
                );
                if (studentEnrollment) {
                    isEnrolled = true;
                    break;
                }
            }
        }

        if (!isEnrolled) {
            throw new Error('You are not enrolled in this batch');
        }

        return { exam: examDoc, isAuthorized: true };
    }

    /**
     * Validate exam timing
     */
    static validateExamTiming(exam) {
        const now = new Date();
        const startTime = new Date(exam.schedule?.startTime || exam.scheduledAt); // Support legacy & new

        // Support legacy data: compute endTime from scheduledAt + duration if schedule.endTime is missing
        const endTime = exam.schedule?.endTime
            ? new Date(exam.schedule.endTime)
            : new Date(new Date(exam.scheduledAt).getTime() + exam.duration * 60 * 1000);

        if (isNaN(endTime.getTime())) {
            throw new Error('Invalid exam schedule: missing end time');
        }

        // Availability Check 1: Has it started?
        if (now < startTime) {
            const minutesUntilStart = Math.ceil((startTime - now) / 1000 / 60);
            throw new Error(`Exam will start in ${minutesUntilStart} minutes`);
        }

        // Availability Check 2: Has the WINDOW closed?
        // Note: This is the global availability window. 
        // Individual student timer is separate (checked in validateSubmissionTime).
        if (now > endTime) {
            throw new Error('Exam availability window has closed');
        }

        return { isValid: true, timeRemaining: endTime - now };
    }

    /**
     * Check for existing submission
     */
    static async checkExistingSubmission(examId, studentId) {
        const submission = await ExamSubmission.findOne({
            exam: examId,
            student: studentId
        });

        if (submission && submission.status === 'submitted') {
            throw new Error('You have already submitted this exam');
        }

        return submission; // Return if in_progress (can resume)
    }

    /**
     * Prevent multiple simultaneous sessions
     */
    static async validateSingleSession(examId, studentId, sessionId) {
        // Check if there's an active submission with different session
        const activeSubmission = await ExamSubmission.findOne({
            exam: examId,
            student: studentId,
            status: 'in_progress'
        });

        if (activeSubmission && activeSubmission.browserFingerprint && activeSubmission.browserFingerprint !== sessionId) {
            // Log suspicious activity
            await this.logSuspiciousActivity({
                submission: activeSubmission._id,
                student: studentId,
                exam: examId,
                eventType: 'multiple_sessions',
                severity: 'critical',
                metadata: {
                    newSessionId: sessionId,
                    existingSessionId: activeSubmission.browserFingerprint
                }
            });

            throw new Error('Exam is already open in another window/device');
        }

        return true;
    }

    /**
     * Validate submission timing (server-side)
     */
    static validateSubmissionTime(submission, exam) {
        const startTime = new Date(submission.startedAt);
        const now = new Date();
        const elapsedMinutes = (now - startTime) / 1000 / 60;

        // Allow 2 minute grace period for network latency
        const allowedTime = exam.duration + 2;

        if (elapsedMinutes > allowedTime) {
            return {
                isValid: false,
                exceeded: true,
                elapsedMinutes: Math.floor(elapsedMinutes),
                allowedMinutes: exam.duration
            };
        }

        return { isValid: true, elapsedMinutes: Math.floor(elapsedMinutes) };
    }

    /**
     * Log suspicious activity
     */
    static async logSuspiciousActivity(data) {
        const activity = await SuspiciousActivity.create(data);

        // Also add to submission's embedded events
        if (data.submission) {
            await ExamSubmission.findByIdAndUpdate(
                data.submission,
                {
                    $push: {
                        suspiciousEvents: {
                            type: data.eventType,
                            timestamp: data.timestamp || new Date(),
                            metadata: data.metadata
                        }
                    }
                }
            );
        }

        return activity;
    }

    /**
     * Calculate severity score for submission
     */
    static calculateIntegrityScore(submission) {
        const weights = {
            tab_switch: 1,
            fullscreen_exit: 2,
            copy_attempt: 3,
            paste_attempt: 3,
            right_click: 1,
            dev_tools_open: 5,
            multiple_sessions: 10
        };

        const totalScore = (submission.suspiciousEvents || []).reduce((sum, event) => {
            return sum + (weights[event.type] || 1);
        }, 0);

        // Lower score = better integrity
        return {
            score: totalScore,
            rating: totalScore === 0 ? 'excellent' :
                totalScore < 5 ? 'good' :
                    totalScore < 10 ? 'suspicious' : 'highly_suspicious'
        };
    }
}
