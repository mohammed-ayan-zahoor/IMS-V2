import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FollowUp from "@/models/FollowUp";
import Enquiry from "@/models/Enquiry";
import Batch from "@/models/Batch";
import { getInstituteScope } from "@/middleware/instituteScope";
import * as XLSX from "xlsx";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        if (!['admin', 'staff', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');
        
        let startDate, endDate;
        
        if (dateParam) {
            const selectedDate = new Date(dateParam);
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const today = new Date();
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
        }

        const followUps = await FollowUp.find({
            institute: scope.instituteId,
            date: { $gte: startDate, $lte: endDate }
        })
        .populate('student', 'profile')
        .populate('staff', 'fullName')
        .sort({ date: -1 })
        .lean();

        // Fetch enquiries updated on the selected date (status: Pending)
        const enquiries = await Enquiry.find({
            institute: scope.instituteId,
            status: 'Pending',
            updatedAt: { $gte: startDate, $lte: endDate }
        })
        .populate('course', 'name')
        .populate('createdBy', 'fullName')
        .sort({ updatedAt: -1 })
        .lean();

        if (followUps.length === 0 && enquiries.length === 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet([], { 
                header: ["Student Name", "Phone", "Course", "Comment", "Date", "Next Due Date"] 
            });
            XLSX.utils.book_append_sheet(wb, ws, "Follow-ups");
            
            const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
            
            const exportDate = dateParam || new Date().toISOString().split('T')[0];
            return new NextResponse(buf, {
                status: 200,
                headers: {
                    "Content-Disposition": `attachment; filename="followups_${exportDate}.xlsx"`,
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                },
            });
        }

        const exportData = await Promise.all(followUps.map(async (fu) => {
            let course = "N/A";
            
            if (fu.student?._id) {
                const studentBatches = await Batch.find({
                    'enrolledStudents.student': fu.student._id,
                    deletedAt: null
                }).populate('course', 'name').lean();
                
                if (studentBatches?.length > 0) {
                    const courses = [...new Set(
                        studentBatches
                            .filter(b => b.course?.name)
                            .map(b => b.course.name)
                    )];
                    course = courses.join(', ');
                }
            }

            const firstName = fu.student?.profile?.firstName || "";
            const lastName = fu.student?.profile?.lastName || "";
            const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

            return {
                "Student Name": fullName,
                "Phone": fu.student?.profile?.phone || "N/A",
                "Course": course,
                "Comment": fu.response || "",
                "Date": fu.date ? new Date(fu.date).toISOString().split('T')[0] : "",
                "Next Due Date": fu.nextActionDate ? new Date(fu.nextActionDate).toISOString().split('T')[0] : "",
                "Type": "Student"
            };
        }));

        // Map enquiries to export format
        const enquiryExportData = enquiries.map(e => ({
            "Student Name": e.studentName || "Unknown",
            "Phone": e.contactNumber || "N/A",
            "Course": e.course?.name || "N/A",
            "Comment": e.notes || "",
            "Date": e.updatedAt ? new Date(e.updatedAt).toISOString().split('T')[0] : "",
            "Next Due Date": e.followUpDate ? new Date(e.followUpDate).toISOString().split('T')[0] : "",
            "Type": "Enquiry"
        }));

        // Combine and sort by date (newest first)
        const combinedData = [...exportData, ...enquiryExportData].sort((a, b) => {
            if (!a.Date) return 1;
            if (!b.Date) return -1;
            return new Date(b.Date) - new Date(a.Date);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(combinedData);
        
        const wscols = [
            { wch: 25 },
            { wch: 15 },
            { wch: 25 },
            { wch: 40 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Follow-ups");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        
        const exportDate = dateParam || new Date().toISOString().split('T')[0];

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="followups_${exportDate}.xlsx"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });

    } catch (error) {
        console.error("Export Follow-ups Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}