import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import OfflineExam from "@/models/OfflineExam";
import OfflineExamResult from "@/models/OfflineExamResult";
import Batch from "@/models/Batch";
import User from "@/models/User";
import GradingScale from "@/models/GradingScale";
import { connectDB } from "@/lib/mongodb";

// GET results for a specific exam and batch
export async function GET(req, { params }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batch');
        if (!batchId) {
            return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
        }

        const examId = params.id;
        const exam = await OfflineExam.findOne({ _id: examId, institute: scope.instituteId, deletedAt: null });
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        // Fetch all students in the batch
        const batch = await Batch.findOne({ _id: batchId, institute: scope.instituteId, deletedAt: null })
            .populate('enrolledStudents.student', 'profile.firstName profile.lastName profile.rollNumber enrollmentNumber');
        
        if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

        const activeStudents = batch.enrolledStudents
            .filter(e => e.status === 'active')
            .map(e => e.student);

        // Fetch existing results
        const existingResults = await OfflineExamResult.find({
            exam: examId,
            batch: batchId,
            deletedAt: null
        });

        // Map results to students, creating empty structures for students without results
        const resultsMap = {};
        existingResults.forEach(r => {
            resultsMap[r.student.toString()] = r;
        });

        const formattedData = activeStudents.map(student => {
            const existing = resultsMap[student._id.toString()];
            return {
                student: {
                    _id: student._id,
                    name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(),
                    rollNumber: student.profile?.rollNumber,
                    enrollmentNumber: student.enrollmentNumber
                },
                resultId: existing ? existing._id : null,
                marks: existing ? existing.marks : [],
                coScholasticRatings: existing ? existing.coScholasticRatings : [],
                teacherRemarks: existing ? existing.teacherRemarks : "",
                totalObtained: existing ? existing.totalObtainedMarks : null,
                percentage: existing ? existing.percentage : null,
                overallGrade: existing ? existing.overallGrade : null,
                overallResult: existing ? existing.overallResult : 'pass',
                isReExam: existing ? existing.isReExam : false
            };
        });

        return NextResponse.json({ results: formattedData, exam });
    } catch (error) {
        console.error("API Error [OfflineExamResults GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST bulk save/update results
export async function POST(req, { params }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const examId = params.id;
        const body = await req.json();
        const { batchId, studentResults } = body; // Array of { studentId, marks, coScholasticRatings, teacherRemarks, isReExam }

        if (!batchId || !Array.isArray(studentResults)) {
            return NextResponse.json({ error: "Batch ID and studentResults array are required" }, { status: 400 });
        }

        const exam = await OfflineExam.findOne({ _id: examId, institute: scope.instituteId, deletedAt: null });
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        // Calculate grades if scale exists
        let scale = null;
        if (exam.gradingScale) {
            scale = await GradingScale.findById(exam.gradingScale);
        }

        const totalMaxMarks = exam.subjects.reduce((sum, s) => sum + (s.maxMarks || 0), 0);

        // Process each student result
        const bulkOps = [];
        const now = new Date();

        for (const data of studentResults) {
            let totalObtained = 0;
            let hasFail = false;
            let appearedSubjects = 0;

            const processedMarks = (data.marks || []).map(m => {
                const subjectConfig = exam.subjects.find(s => s.subject.toString() === m.subject.toString());
                const maxForSub = subjectConfig ? subjectConfig.maxMarks : 0;
                const passingForSub = subjectConfig ? subjectConfig.passingMarks : 0;

                let obtained = null;
                if (!m.isAbsent && !m.isNotAppeared && m.obtainedMarks !== null) {
                    obtained = Number(m.obtainedMarks) + Number(m.graceMarks || 0);
                    // Cap at maxMarks
                    if (obtained > maxForSub) obtained = maxForSub;
                    totalObtained += obtained;
                    appearedSubjects++;

                    if (obtained < passingForSub) {
                        hasFail = true;
                    }
                }

                return {
                    subject: m.subject,
                    obtainedMarks: obtained,
                    isAbsent: !!m.isAbsent,
                    isNotAppeared: !!m.isNotAppeared,
                    graceMarks: Number(m.graceMarks || 0),
                    remarks: m.remarks || ""
                };
            });

            const percentage = appearedSubjects > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;
            
            let overallGrade = null;
            let gradePoint = null;
            if (scale && scale.ranges) {
                const range = scale.ranges.find(r => percentage >= r.minPercentage && percentage <= r.maxPercentage);
                if (range) {
                    overallGrade = range.grade;
                    gradePoint = range.gradePoint;
                }
            }

            let overallResult = hasFail ? 'fail' : 'pass';
            // Custom logic for compartment/promoted could be added here based on policy

            const resultDoc = {
                exam: examId,
                student: data.studentId,
                batch: batchId,
                marks: processedMarks,
                coScholasticRatings: data.coScholasticRatings || [],
                totalObtainedMarks: totalObtained,
                totalMaxMarks: totalMaxMarks,
                percentage: parseFloat(percentage.toFixed(2)),
                overallGrade,
                gradePoint,
                overallResult,
                isReExam: !!data.isReExam,
                teacherRemarks: data.teacherRemarks || "",
                evaluatedBy: session.user.id,
                deletedAt: null
            };

            bulkOps.push({
                updateOne: {
                    filter: { exam: examId, student: data.studentId },
                    update: { $set: resultDoc, $setOnInsert: { createdBy: session.user.id } },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            await OfflineExamResult.bulkWrite(bulkOps);
        }

        return NextResponse.json({ success: true, message: `Saved results for ${bulkOps.length} students` });
    } catch (error) {
        console.error("API Error [OfflineExamResults POST]:", error);
        return NextResponse.json({ error: error.message || "Failed to save results" }, { status: 400 });
    }
}
