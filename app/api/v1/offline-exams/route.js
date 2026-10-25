import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import OfflineExam from "@/models/OfflineExam";
import { connectDB } from "@/lib/mongodb";

export async function GET(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const course = searchParams.get('course');
        const rawSessionFilter = searchParams.get('session') || searchParams.get('sessionId') || req.headers.get('x-session-id');
        const status = searchParams.get('status');
        
        const query = { deletedAt: null };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }
        
        if (course) query.course = course;
        if (rawSessionFilter && rawSessionFilter !== 'all') {
            query.session = rawSessionFilter;
        } else if (!rawSessionFilter && scope.instituteId && scope.user?.role === 'instructor') {
            try {
                const Session = (await import("@/models/Session")).default;
                const activeSession = await Session.findOne({
                    $or: [{ instituteId: scope.instituteId }, { institute: scope.instituteId }],
                    isActive: true,
                    deletedAt: null
                }).select('_id').lean();
                if (activeSession) {
                    query.session = activeSession._id;
                }
            } catch (err) {
                console.warn("[OFFLINE_EXAMS_GET] Failed to derive active session:", err);
            }
        }
        if (status) query.status = status;

        // Apply Instructor isolation
        if (scope.user.role === 'instructor') {
            const User = (await import("@/models/User")).default;
            const instructor = await User.findById(scope.user.id).select('assignments');
            const assignedCourses = instructor?.assignments?.courses || [];
            const assignedBatches = instructor?.assignments?.batches || [];

            query.$or = [
                { course: { $in: assignedCourses } },
                { batches: { $in: assignedBatches } }
            ];
        }

        const exams = await OfflineExam.find(query)
            .populate('course', 'name code')
            .populate('session', 'name')
            .populate('batches', 'name')
            .populate('subjects.subject', 'name code')
            .populate('gradingScale', 'name')
            .sort({ createdAt: -1 });
            
        return NextResponse.json({ exams });
    } catch (error) {
        console.error("API Error [OfflineExams GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        const hasAccess = session && (["admin", "super_admin"].includes(session.user.role) || 
            session.user.role === "instructor");
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();

        // Auto-resolve course if missing or if passed as a batch ID
        let courseId = body.course;
        const batches = Array.isArray(body.batches) ? body.batches : (body.batch ? [body.batch] : []);
        const Course = (await import("@/models/Course")).default;
        const Batch = (await import("@/models/Batch")).default;

        let validCourse = courseId ? await Course.findOne({ _id: courseId, institute: scope.instituteId, deletedAt: null }) : null;
        if (!validCourse && batches.length > 0) {
            const batchDoc = await Batch.findById(batches[0]).select('course');
            if (batchDoc?.course) {
                courseId = batchDoc.course;
                validCourse = await Course.findOne({ _id: courseId, institute: scope.instituteId, deletedAt: null });
            }
        }
        
        // Basic validation
        if (!body.title || !courseId || !body.session) {
            return NextResponse.json({ error: "Title, course, and session are required" }, { status: 400 });
        }

        const Session = (await import("@/models/Session")).default;
        const validSession = await Session.findOne({
            _id: body.session,
            $or: [{ instituteId: scope.instituteId }, { institute: scope.instituteId }],
            deletedAt: null
        });
        if (!validSession) {
            return NextResponse.json({ error: "The selected academic session is invalid for this institute" }, { status: 400 });
        }

        // Auto-resolve subjects if subjectName was sent instead of subject ObjectId
        const Subject = (await import("@/models/Subject")).default;
        let subjects = Array.isArray(body.subjects) ? body.subjects : [];
        if (subjects.length > 0) {
            subjects = await Promise.all(subjects.map(async (s) => {
                let sId = s.subject || s.subjectId;
                if (!sId && s.subjectName) {
                    const cleanName = s.subjectName.trim();
                    let subDoc = await Subject.findOne({
                        institute: scope.instituteId,
                        course: courseId,
                        name: cleanName,
                        deletedAt: null
                    });
                    if (!subDoc) {
                        try {
                            const subCode = cleanName.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SUB';
                            subDoc = await Subject.create({
                                name: cleanName,
                                code: subCode,
                                course: courseId,
                                institute: scope.instituteId,
                                createdBy: session.user.id
                            });
                        } catch (e) {
                            subDoc = await Subject.findOne({ institute: scope.instituteId, course: courseId, deletedAt: null });
                        }
                    }
                    if (subDoc) sId = subDoc._id;
                }
                return {
                    ...s,
                    subject: sId,
                    maxMarks: Number(s.maxMarks) || (Number(s.theoryMarks || 0) + Number(s.practicalMarks || 0)) || 100,
                    passingMarks: Number(s.passingMarks) || 35,
                    examDate: s.examDate ? new Date(s.examDate) : new Date()
                };
            }));
        }

        const exam = await OfflineExam.create({
            ...body,
            course: courseId,
            batches,
            subjects,
            session: validSession._id,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        return NextResponse.json(exam, { status: 201 });
    } catch (error) {
        console.error("API Error [OfflineExams POST]:", error);
        return NextResponse.json({ error: error.message || "Failed to create offline exam" }, { status: 400 });
    }
}
