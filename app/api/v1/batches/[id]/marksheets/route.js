import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import ExamSubmission from "@/models/ExamSubmission";
import Exam from "@/models/Exam";
import User from "@/models/User";

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "admin" && session.user.role !== "instructor")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Ensure models are registered
        if (!mongoose.models.Exam) mongoose.model('Exam', Exam.schema);
        if (!mongoose.models.User) mongoose.model('User', User.schema);

        // Fetch the batch with its enrolled students
        const batch = await Batch.findById(id).populate({
            path: 'enrolledStudents.student',
            select: 'profile fullName enrollmentNumber'
        }).lean();

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        const activeStudentIds = batch.enrolledStudents
            .filter(enrollment => enrollment.status === "active")
            .map(enrollment => enrollment.student._id);

        if (activeStudentIds.length === 0) {
            return NextResponse.json({ students: [] }, { status: 200 });
        }

        // Fetch all evaluated/completed exam submissions for these students in this batch's exams
        const submissions = await ExamSubmission.find({
            student: { $in: activeStudentIds },
            status: { $in: ['evaluated', 'submitted'] }
        })
        .populate({
            path: 'exam',
            select: 'title subject totalMarks batches',
            populate: {
                path: 'subject',
                select: 'name code'
            }
        })
        .lean();

        // Filter submissions to only include those belonging to exams assigned to THIS batch
        const batchSubmissions = submissions.filter(sub => 
            sub.exam?.batches?.some(bId => String(bId) === String(id))
        );

        // Group submissions by student
        const studentsData = activeStudentIds.map(studentId => {
            const studentInfo = batch.enrolledStudents.find(
                e => String(e.student._id) === String(studentId)
            ).student;

            const studentExams = batchSubmissions.filter(
                sub => String(sub.student) === String(studentId)
            );

            return {
                student: {
                    _id: studentInfo._id,
                    fullName: studentInfo.fullName || `${studentInfo.profile?.firstName} ${studentInfo.profile?.lastName}`,
                    enrollmentNumber: studentInfo.enrollmentNumber || studentInfo.profile?.rollNumber
                },
                submissions: studentExams.map(sub => ({
                    _id: sub._id,
                    examId: sub.exam._id,
                    title: sub.exam.title,
                    subjectName: sub.exam.subject?.name || "General",
                    totalMarks: sub.exam.totalMarks || 0,
                    score: sub.score || 0,
                    percentage: sub.percentage || 0,
                    status: sub.status,
                    submittedAt: sub.submittedAt
                }))
            };
        });

        // Filter out students with zero submissions if desired, but here we return all active
        return NextResponse.json({ students: studentsData }, { status: 200 });
    } catch (error) {
        console.error("Batch Marksheets fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch marksheets data" }, { status: 500 });
    }
}
