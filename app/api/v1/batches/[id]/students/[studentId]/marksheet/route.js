import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import ExamSubmission from "@/models/ExamSubmission";
import Exam from "@/models/Exam";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "admin" && session.user.role !== "instructor")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id: batchId, studentId } = await params;

        const { searchParams } = new URL(request.url);
        const examIdsParam = searchParams.get('exams');
        
        if (!examIdsParam) {
            return NextResponse.json({ error: "No exam IDs provided" }, { status: 400 });
        }

        const examIds = examIdsParam.split(',').map(id => id.trim()).filter(Boolean);

        // Ensure models are registered
        if (!mongoose.models.Exam) mongoose.model('Exam', Exam.schema);
        if (!mongoose.models.User) mongoose.model('User', User.schema);

        // Fetch Student
        const student = await User.findById(studentId).select("profile fullName enrollmentNumber").lean();
        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Fetch Batch
        const batch = await Batch.findById(batchId).select("name course").populate('course', 'name code').lean();

        // Fetch Institute Branding using session scope
        let instituteData = { name: "Institute Name", branding: {}, address: {} };
        const scope = await getInstituteScope(request);
        
        if (scope?.instituteId) {
            try {
                const inst = await Institute.findById(scope.instituteId).lean();
                if (inst) {
                    instituteData = {
                        name: inst.name || 'Institute Name',
                        branding: inst.branding || {},
                        address: inst.address || {}
                    };
                }
            } catch (err) {
                console.error("Could not fetch institute details", err);
            }
        }

        // Fetch Submissions
        const submissions = await ExamSubmission.find({
            student: studentId,
            exam: { $in: examIds },
            status: { $in: ['evaluated', 'submitted'] }
        })
        .populate({
            path: 'exam',
            select: 'title subject totalMarks passingMarks',
            populate: {
                path: 'subject',
                select: 'name code'
            }
        })
        .lean();

        // Prepare student payload
        const studentPayload = {
            _id: student._id,
            fullName: student.fullName || `${student.profile?.firstName} ${student.profile?.lastName}`,
            enrollmentNumber: student.profile?.rollNumber || student.enrollmentNumber || "N/A"
        };

        return NextResponse.json({ 
            student: studentPayload,
            batch: batch,
            instituteData,
            submissions 
        }, { status: 200 });
        
    } catch (error) {
        console.error("Combined Marksheet fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch marksheet data" }, { status: 500 });
    }
}
