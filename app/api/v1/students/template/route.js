import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Define headers
        const headers = [
            "FirstName",
            "LastName",
            "Email",
            "Phone",
            "Password",
            "EnrollmentNumber",
            "Gender" // Optional
        ];

        // Create sample data for clarity (optional, or just headers)
        const sampleData = [
            {
                FirstName: "John",
                LastName: "Doe",
                Email: "john.doe@example.com",
                Phone: "9876543210",
                // Password: "", // Omitted to enforce security; system will generate if missing
                EnrollmentNumber: "STU001",
                Gender: "Male"
            }
        ];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });

        // Set column widths for better UX
        const wscols = [
            { wch: 20 }, // FirstName
            { wch: 20 }, // LastName
            { wch: 30 }, // Email
            { wch: 15 }, // Phone
            { wch: 15 }, // Password
            { wch: 20 }, // Enrollment
            { wch: 10 }  // Gender
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Students");

        // Write to buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as download
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Disposition": 'attachment; filename="student_import_template.xlsx"',
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error("Template Gen Error:", error);
        return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
    }
}
