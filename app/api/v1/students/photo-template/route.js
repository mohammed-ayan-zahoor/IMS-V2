import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import User from "@/models/User";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get("batchId");
        const courseId = searchParams.get("courseId");

        if (!batchId && !courseId) {
            return NextResponse.json({ error: "Please provide either a batchId or courseId" }, { status: 400 });
        }

        await connectDB();

        let studentsList = [];
        let sheetTitle = "Students";

        if (batchId) {
            const batchDoc = await Batch.findById(batchId)
                .populate('course', 'name code')
                .populate({
                    path: 'enrolledStudents.student',
                    select: 'profile.firstName profile.lastName profile.avatar enrollmentNumber metadata.studentDetails.rollNo metadata.studentDetails.grNumber'
                })
                .lean();

            if (!batchDoc) {
                return NextResponse.json({ error: "Section/Batch not found" }, { status: 404 });
            }

            const courseName = batchDoc.course?.name || "Class";
            const batchName = batchDoc.name || "Section";
            sheetTitle = `${courseName}_${batchName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

            const enrolled = batchDoc.enrolledStudents || [];
            studentsList = enrolled
                .filter(e => e.status === 'active' && e.student)
                .map(e => {
                    const s = e.student;
                    return {
                        StudentID: s._id?.toString() || "",
                        FirstName: s.profile?.firstName || "",
                        LastName: s.profile?.lastName || "",
                        RollNo: s.metadata?.studentDetails?.rollNo || "",
                        AdmissionNo: s.enrollmentNumber || s.metadata?.studentDetails?.grNumber || "",
                        PhotoNo: "", // Empty for operator to fill
                        HasCurrentPhoto: s.profile?.avatar ? "Yes" : "No"
                    };
                });
        } else if (courseId) {
            let courseDoc = await Course.findById(courseId).select('name code').lean();
            if (!courseDoc) {
                const CourseBundle = (await import("@/models/CourseBundle")).default;
                courseDoc = await CourseBundle.findById(courseId).select('name code').lean();
            }
            if (!courseDoc) {
                return NextResponse.json({ error: "Class/Course not found" }, { status: 404 });
            }
            sheetTitle = `${courseDoc.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");

            // Find all active students enrolled in batches of this course or bundle
            const batches = await Batch.find({
                $or: [
                    { course: courseId },
                    { courseBundle: courseId }
                ],
                deletedAt: null
            })
                .populate({
                    path: 'enrolledStudents.student',
                    select: 'profile.firstName profile.lastName profile.avatar enrollmentNumber metadata.studentDetails.rollNo metadata.studentDetails.grNumber'
                })
                .lean();

            const seenStudentIds = new Set();
            for (const b of batches) {
                for (const e of (b.enrolledStudents || [])) {
                    if (e.status === 'active' && e.student && !seenStudentIds.has(e.student._id?.toString())) {
                        seenStudentIds.add(e.student._id?.toString());
                        const s = e.student;
                        studentsList.push({
                            StudentID: s._id?.toString() || "",
                            FirstName: s.profile?.firstName || "",
                            LastName: s.profile?.lastName || "",
                            RollNo: s.metadata?.studentDetails?.rollNo || "",
                            AdmissionNo: s.enrollmentNumber || s.metadata?.studentDetails?.grNumber || "",
                            PhotoNo: "",
                            HasCurrentPhoto: s.profile?.avatar ? "Yes" : "No"
                        });
                    }
                }
            }
        }

        // Sort students by RollNo (numeric) or FirstName
        studentsList.sort((a, b) => {
            const rollA = parseInt(a.RollNo, 10);
            const rollB = parseInt(b.RollNo, 10);
            if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
            return (a.FirstName || "").localeCompare(b.FirstName || "");
        });

        // If no students exist, add a sample placeholder row so headers are present
        const rows = studentsList.length > 0 ? studentsList : [
            {
                StudentID: "SAMPLE_ID_DO_NOT_EDIT",
                FirstName: "John",
                LastName: "Doe",
                RollNo: "101",
                AdmissionNo: "ADM001",
                PhotoNo: "101",
                HasCurrentPhoto: "No"
            }
        ];

        // Generate Excel Workbook
        const worksheet = XLSX.utils.json_to_sheet(rows, {
            header: ["StudentID", "FirstName", "LastName", "RollNo", "AdmissionNo", "PhotoNo", "HasCurrentPhoto"]
        });

        // Set column widths for nice formatting
        worksheet["!cols"] = [
            { wch: 26 }, // StudentID
            { wch: 16 }, // FirstName
            { wch: 16 }, // LastName
            { wch: 10 }, // RollNo
            { wch: 16 }, // AdmissionNo
            { wch: 14 }, // PhotoNo
            { wch: 16 }  // HasCurrentPhoto
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Photo_Upload_Sheet");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
        const filename = `Photo_Sheet_${sheetTitle}.xlsx`;

        return new Response(excelBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error("Photo Template API Error:", error);
        return NextResponse.json({ error: "Failed to generate class photo template", details: error.message }, { status: 500 });
    }
}
