import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import OfflineExam from "@/models/OfflineExam";
import OfflineExamResult from "@/models/OfflineExamResult";
import Attendance from "@/models/Attendance";
import { getInstituteScope } from "@/middleware/instituteScope";

// Convert A-E or 1-5 co-scholastic rating to numeric (0-5 scale)
function ratingToNumeric(rating, scale) {
    if (!rating) return 0;
    if (scale === "1-5") return Math.min(5, Math.max(0, parseInt(rating) || 0));
    const map = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    return map[String(rating).toUpperCase()] || 0;
}

function numericToGrade(val, scale) {
    if (scale === "1-5") return String(Math.round(val));
    const labels = ["", "E", "D", "C", "B", "A"];
    return labels[Math.round(val)] || "N/A";
}

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const includeOnline = searchParams.get("includeOnline") === "true";

        // 1. Load student with full promotion history populated
        const student = await User.findOne({
            _id: id,
            role: "student",
            deletedAt: null,
        })
            .populate("promotionHistory.session", "sessionName startDate endDate")
            .populate({
                path: "promotionHistory.batch",
                populate: { path: "course", select: "name code" },
            })
            .select("-passwordHash")
            .lean();

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Authorise: super_admin can see any, admin can only see their institute's students
        if (!scope.isSuperAdmin && student.institute?.toString() !== scope.instituteId?.toString()) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const instituteId = scope.isSuperAdmin ? student.institute : scope.instituteId;

        // 2. Build sorted timeline from promotionHistory (deduplicate by session, keep latest)
        const sessionMap = new Map();
        for (const entry of student.promotionHistory || []) {
            const sid = entry.session?._id?.toString() || entry.session?.toString();
            if (!sid) continue;
            // Keep the entry (they are in chronological order of promotion, so later entries overwrite)
            sessionMap.set(sid, entry);
        }

        const sortedHistory = [...sessionMap.values()].sort((a, b) => {
            const da = a.session?.startDate ? new Date(a.session.startDate) : 0;
            const db = b.session?.startDate ? new Date(b.session.startDate) : 0;
            return da - db;
        });

        // Build timeline entries with grade labels derived from Course name
        const timeline = sortedHistory.map((entry, index) => ({
            sessionId: entry.session?._id?.toString() || entry.session?.toString(),
            sessionName: entry.session?.sessionName || `Session ${index + 1}`,
            batchId: entry.batch?._id?.toString() || entry.batch?.toString(),
            gradeLabel: entry.batch?.course?.name || entry.batch?.name || `Year ${index + 1}`,
            batchName: entry.batch?.name || "",
            startDate: entry.session?.startDate,
            endDate: entry.session?.endDate,
        }));

        // 3. Aggregate data for each session
        const academicDataMap = {};     // subject name -> [{ gradeLabel, sessionName, percentage }]
        const coScholasticDataMap = {}; // paramName   -> [{ gradeLabel, sessionName, ratingValue, ratingLabel, scale }]
        const attendanceData = [];      // [{ gradeLabel, sessionName, percentage, present, total }]
        const examBreakdown = {};       // gradeLabel   -> [{ examTitle, examType, percentage, rank, grade, result }]
        const remarksTimeline = [];     // [{ gradeLabel, examTitle, remarks, date }]
        const onlineBreakdown = [];     // optional

        for (const te of timeline) {
            const { sessionId, sessionName, batchId, gradeLabel } = te;
            if (!sessionId) continue;

            // ── Offline Exams ────────────────────────────────────────────────
            const offlineExams = await OfflineExam.find({
                institute: instituteId,
                session: sessionId,
                status: { $ne: "draft" },
                deletedAt: null,
            })
                .populate("subjects.subject", "name")
                .lean();

            if (offlineExams.length > 0) {
                const examIds = offlineExams.map((e) => e._id);

                const results = await OfflineExamResult.find({
                    student: student._id,
                    exam: { $in: examIds },
                    deletedAt: null,
                }).lean();

                // Per-subject accumulated (across all exams in session)
                const subjectAccum = {}; // subjectId -> { name, obtained, max }
                // Per co-scholastic param accumulated
                const coSAccum = {};     // paramName -> { ratings[], scale }

                for (const result of results) {
                    const exam = offlineExams.find(
                        (e) => e._id.toString() === result.exam.toString()
                    );
                    if (!exam) continue;

                    // Subject marks accumulation
                    for (const mark of result.marks || []) {
                        if (mark.isAbsent || mark.isNotAppeared) continue;
                        const subjId = mark.subject?.toString();
                        if (!subjId) continue;
                        const examSubj = exam.subjects?.find(
                            (s) =>
                                (s.subject?._id?.toString() || s.subject?.toString()) === subjId
                        );
                        if (!examSubj || !examSubj.maxMarks) continue;

                        const obtained = (mark.obtainedMarks || 0) + (mark.graceMarks || 0);
                        const subjName = examSubj.subject?.name || `Subject ${subjId.slice(-4)}`;
                        if (!subjectAccum[subjId]) {
                            subjectAccum[subjId] = { name: subjName, obtained: 0, max: 0 };
                        }
                        subjectAccum[subjId].obtained += obtained;
                        subjectAccum[subjId].max += examSubj.maxMarks;
                    }

                    // Co-scholastic ratings accumulation
                    for (const csr of result.coScholasticRatings || []) {
                        const paramDef = exam.coScholastic?.find(
                            (c) => c.paramName === csr.paramName
                        );
                        const scale = paramDef?.ratingScale || "A-E";
                        if (!coSAccum[csr.paramName]) coSAccum[csr.paramName] = { ratings: [], scale };
                        coSAccum[csr.paramName].ratings.push(ratingToNumeric(csr.rating, scale));
                    }

                    // Exam breakdown entry
                    if (!examBreakdown[gradeLabel]) examBreakdown[gradeLabel] = [];
                    examBreakdown[gradeLabel].push({
                        examTitle: exam.title,
                        examType: exam.examType,
                        percentage: Math.round((result.percentage || 0) * 10) / 10,
                        rank: result.rank,
                        grade: result.overallGrade,
                        result: result.overallResult,
                        totalObtained: result.totalObtainedMarks,
                        totalMax: result.totalMaxMarks,
                    });

                    // Remarks
                    if (result.teacherRemarks?.trim()) {
                        remarksTimeline.push({
                            gradeLabel,
                            sessionName,
                            examTitle: exam.title,
                            remarks: result.teacherRemarks,
                            date: result.updatedAt,
                        });
                    }
                }

                // Push to academic series
                for (const [, perf] of Object.entries(subjectAccum)) {
                    const pct = perf.max > 0 ? Math.round((perf.obtained / perf.max) * 1000) / 10 : 0;
                    if (!academicDataMap[perf.name]) academicDataMap[perf.name] = [];
                    academicDataMap[perf.name].push({ gradeLabel, sessionName, percentage: pct });
                }

                // Push to co-scholastic series
                for (const [paramName, { ratings, scale }] of Object.entries(coSAccum)) {
                    const avg = ratings.length > 0
                        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
                        : 0;
                    if (!coScholasticDataMap[paramName]) coScholasticDataMap[paramName] = [];
                    coScholasticDataMap[paramName].push({
                        gradeLabel,
                        sessionName,
                        ratingValue: avg,
                        ratingLabel: numericToGrade(avg, scale),
                        scale,
                    });
                }
            }

            // ── Attendance ───────────────────────────────────────────────────
            if (batchId) {
                const dateFilter = {
                    institute: instituteId,
                    batch: batchId,
                };
                if (te.startDate) dateFilter.date = { $gte: new Date(te.startDate) };
                if (te.endDate) {
                    dateFilter.date = dateFilter.date || {};
                    dateFilter.date.$lte = new Date(te.endDate);
                }

                const attRecords = await Attendance.find(dateFilter)
                    .select("records date")
                    .lean();

                let present = 0, total = 0;
                for (const rec of attRecords) {
                    const sr = rec.records?.find(
                        (r) => r.student?.toString() === student._id.toString()
                    );
                    if (sr) {
                        total++;
                        if (["present", "late"].includes(sr.status)) present++;
                    }
                }

                attendanceData.push({
                    gradeLabel,
                    sessionName,
                    percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
                    present,
                    total,
                    absent: total - present,
                });
            }

            // ── Online Exams (optional) ──────────────────────────────────────
            if (includeOnline && batchId) {
                try {
                    const ExamModel = (await import("@/models/Exam")).default;
                    const ExamSubmission = (await import("@/models/ExamSubmission")).default;

                    const onlineExams = await ExamModel.find({
                        institute: instituteId,
                        batches: batchId,
                        status: { $in: ["completed", "archived"] },
                        deletedAt: null,
                    })
                        .populate("subject", "name")
                        .select("title subject totalMarks")
                        .lean();

                    if (onlineExams.length > 0) {
                        const oeIds = onlineExams.map((e) => e._id);
                        const subs = await ExamSubmission.find({
                            student: student._id,
                            exam: { $in: oeIds },
                            status: { $in: ["submitted", "evaluated"] },
                        }).lean();

                        for (const sub of subs) {
                            const oe = onlineExams.find(
                                (e) => e._id.toString() === sub.exam.toString()
                            );
                            onlineBreakdown.push({
                                gradeLabel,
                                sessionName,
                                examTitle: oe?.title || "Online Exam",
                                subject: oe?.subject?.name || "General",
                                percentage: Math.round((sub.percentage || 0) * 10) / 10,
                                score: sub.score,
                                totalMarks: oe?.totalMarks,
                            });
                        }
                    }
                } catch (onlineErr) {
                    console.warn("[HOLISTIC] Online exam fetch failed:", onlineErr.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            student: {
                id: student._id,
                name: `${student.profile?.firstName || ""} ${student.profile?.lastName || ""}`.trim(),
                enrollmentNumber: student.enrollmentNumber,
                admissionStd: student.admissionStd,
                admissionDate: student.admissionDate,
                photo: student.profile?.avatar,
                gender: student.profile?.gender,
                status: student.status,
                conduct: student.conduct,
                progress: student.progress,
                remarks: student.remarks,
            },
            timeline: timeline.map((t) => t.gradeLabel),
            academicSeries: Object.entries(academicDataMap).map(([subject, data]) => ({
                subject,
                data,
            })),
            coScholasticSeries: Object.entries(coScholasticDataMap).map(([param, data]) => ({
                param,
                data,
            })),
            attendanceSeries: attendanceData,
            examBreakdown,
            remarksTimeline,
            onlineBreakdown: includeOnline ? onlineBreakdown : undefined,
        });
    } catch (error) {
        console.error("[HOLISTIC_REPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
