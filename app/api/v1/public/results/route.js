import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import WebsiteConfig from "@/models/WebsiteConfig";
import User from "@/models/User";
import Session from "@/models/Session";
import OfflineExam from "@/models/OfflineExam";
import OfflineExamResult from "@/models/OfflineExamResult";
import "@/models/Course";
import "@/models/Batch";
import "@/models/Subject";

// In-memory rate limiting map for results lookup (IP/Identifier => { attempts, lockedUntil })
const rateLimitMap = new Map();

function checkRateLimit(key) {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (record) {
        if (record.lockedUntil && now < record.lockedUntil) {
            const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
            return { locked: true, minutesLeft };
        }
        if (record.lockedUntil && now >= record.lockedUntil) {
            rateLimitMap.delete(key);
        }
    }
    return { locked: false };
}

function recordFailedAttempt(key) {
    const now = Date.now();
    const record = rateLimitMap.get(key) || { attempts: 0, firstAttemptAt: now };

    record.attempts += 1;
    if (record.attempts >= 5) {
        record.lockedUntil = now + 10 * 60 * 1000; // Lock for 10 minutes
    }
    rateLimitMap.set(key, record);
}

function resetAttempts(key) {
    rateLimitMap.delete(key);
}

export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous';
        const rateCheck = checkRateLimit(ip);

        if (rateCheck.locked) {
            return Response.json(
                { 
                    error: `Too many attempts. Try again in ${rateCheck.minutesLeft} minute${rateCheck.minutesLeft > 1 ? 's' : ''}, or contact your school's exam cell.` 
                },
                { status: 429 }
            );
        }

        await connectDB();
        const { instituteCode, enrollmentNumber, dateOfBirth } = await req.json();

        if (!instituteCode || !enrollmentNumber || !dateOfBirth) {
            return Response.json(
                { error: "Please enter both your Enrollment Number and complete Date of Birth." },
                { status: 400 }
            );
        }

        // 1. Resolve Institute
        let institute = await Institute.findOne({
            code: { $regex: new RegExp(`^${instituteCode.trim()}$`, 'i') }
        }).select('name type branding address contactPhone contactEmail code');

        let config = null;
        if (institute) {
            config = await WebsiteConfig.findOne({ instituteId: institute._id });
        } else {
            config = await WebsiteConfig.findOne({ 
                subdomain: { $regex: new RegExp(`^${instituteCode.trim()}$`, 'i') } 
            });
            if (config) {
                institute = await Institute.findById(config.instituteId).select('name type branding address contactPhone contactEmail code');
            }
        }

        if (!institute) {
            return Response.json({ error: "Institution not found." }, { status: 404 });
        }

        // 2. Identify Active Session
        let activeSession = await Session.findOne({
            instituteId: institute._id,
            isActive: true,
            deletedAt: null
        });

        // Fallback to latest session if none is explicitly marked active
        if (!activeSession) {
            activeSession = await Session.findOne({
                instituteId: institute._id,
                deletedAt: null
            }).sort({ createdAt: -1 });
        }

        if (!activeSession) {
            return Response.json({
                success: true,
                student: null,
                session: null,
                institute: {
                    name: institute.name,
                    code: institute.code,
                    logo: institute.branding?.logo || null,
                    address: institute.address || null,
                    phone: institute.contactPhone || null,
                    email: institute.contactEmail || null,
                },
                results: [],
                message: "No active academic session found for this institution."
            });
        }

        // 3. Find Student by Enrollment Number
        const cleanEnrollment = enrollmentNumber.trim();
        const student = await User.findOne({
            institute: institute._id,
            role: 'student',
            enrollmentNumber: { $regex: new RegExp(`^${cleanEnrollment}$`, 'i') }
        }).select('profile enrollmentNumber');

        const notFoundError = "We couldn't match that Enrollment Number and Date of Birth. Double-check both — the enrollment number is on your admit card.";

        if (!student) {
            recordFailedAttempt(ip);
            return Response.json({ error: notFoundError }, { status: 404 });
        }

        // 4. Verify Date of Birth (calendar date YYYY-MM-DD comparison)
        const studentDob = student.profile?.dateOfBirth;
        if (!studentDob) {
            recordFailedAttempt(ip);
            return Response.json({ error: notFoundError }, { status: 404 });
        }

        const studentDobStr = new Date(studentDob).toISOString().slice(0, 10);
        const inputDobStr = new Date(dateOfBirth).toISOString().slice(0, 10);

        if (studentDobStr !== inputDobStr) {
            recordFailedAttempt(ip);
            return Response.json({ error: notFoundError }, { status: 404 });
        }

        // Success: Reset rate limit counter for this IP
        resetAttempts(ip);

        // 5. Query Published Offline Exams for Active Session (excluding hidden)
        const hiddenExams = (config?.resultsPage?.hiddenExams || []).map(id => String(id));

        const publishedExams = await OfflineExam.find({
            institute: institute._id,
            session: activeSession._id,
            status: 'published',
            _id: { $nin: hiddenExams },
            deletedAt: null
        }).populate('course', 'name code').populate('subjects.subject', 'name code');

        const examIds = publishedExams.map(e => e._id);

        if (examIds.length === 0) {
            return Response.json({
                success: true,
                student: {
                    name: `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim() || 'Student',
                    enrollmentNumber: student.enrollmentNumber,
                    avatar: student.profile.avatar || null
                },
                session: {
                    name: activeSession.sessionName || 'Current Session'
                },
                institute: {
                    name: institute.name,
                    code: institute.code,
                    logo: institute.branding?.logo || null,
                    address: institute.address || null,
                    phone: institute.contactPhone || null,
                    email: institute.contactEmail || null,
                },
                results: [],
                message: "No published exam results are available for the current session."
            });
        }

        // 6. Find Results for this Student
        const results = await OfflineExamResult.find({
            student: student._id,
            exam: { $in: examIds },
            deletedAt: null
        })
        .populate({
            path: 'exam',
            populate: [
                { path: 'course', select: 'name code' },
                { path: 'subjects.subject', select: 'name code' }
            ]
        })
        .populate('batch', 'name')
        .populate('marks.subject', 'name code');

        // 7. Format clean result items
        const formattedResults = results.map(r => {
            const exam = r.exam || {};
            const course = exam.course || {};
            const batch = r.batch || {};

            // Map subject marks with max/passing marks from exam schema
            const subjectMap = new Map();
            if (Array.isArray(exam.subjects)) {
                exam.subjects.forEach(s => {
                    const subId = String(s.subject?._id || s.subject);
                    subjectMap.set(subId, {
                        maxMarks: s.maxMarks,
                        passingMarks: s.passingMarks,
                        examDate: s.examDate
                    });
                });
            }

            const subjectMarks = (r.marks || []).map(m => {
                const subId = String(m.subject?._id || m.subject);
                const meta = subjectMap.get(subId) || {};
                return {
                    subjectName: m.subject?.name || 'Subject',
                    subjectCode: m.subject?.code || '',
                    maxMarks: meta.maxMarks ?? null,
                    passingMarks: meta.passingMarks ?? null,
                    obtainedMarks: m.obtainedMarks,
                    isAbsent: m.isAbsent,
                    isNotAppeared: m.isNotAppeared,
                    graceMarks: m.graceMarks || 0,
                    remarks: m.remarks || ''
                };
            });

            return {
                id: r._id,
                examTitle: exam.title || 'Examination',
                examType: exam.examType || 'custom',
                courseName: course.name || 'General',
                batchName: batch.name || 'Standard',
                sessionName: activeSession.sessionName,
                marks: subjectMarks,
                coScholasticRatings: r.coScholasticRatings || [],
                totalObtainedMarks: r.totalObtainedMarks,
                totalMaxMarks: r.totalMaxMarks,
                percentage: r.percentage,
                overallGrade: r.overallGrade || '-',
                gradePoint: r.gradePoint || null,
                rank: r.rank || null,
                overallResult: r.overallResult || 'pass',
                isReExam: r.isReExam || false,
                teacherRemarks: r.teacherRemarks || '',
                publishedAt: r.updatedAt
            };
        });

        return Response.json({
            success: true,
            student: {
                name: `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim() || 'Student',
                enrollmentNumber: student.enrollmentNumber,
                avatar: student.profile.avatar || null,
                dateOfBirth: studentDobStr
            },
            session: {
                name: activeSession.sessionName || 'Current Session'
            },
            institute: {
                name: institute.name,
                code: institute.code,
                logo: institute.branding?.logo || null,
                address: institute.address || null,
                phone: institute.contactPhone || null,
                email: institute.contactEmail || null,
            },
            results: formattedResults
        });

    } catch (error) {
        console.error("[Public Results Lookup Error]:", error);
        return Response.json(
            { error: "An unexpected error occurred while fetching results. Please try again later." },
            { status: 500 }
        );
    }
}
