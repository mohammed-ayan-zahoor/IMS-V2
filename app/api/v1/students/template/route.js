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
            "Gender",
            "DateOfBirth",
            "AdmissionDate",
            "Standard",
            "GRNumber",
            "AadharNumber",
            "UdiseID",
            "ApaarID",
            "PenNumber",
            "FatherName",
            "FatherPhone",
            "FatherAadhar",
            "MotherName",
            "MotherPhone",
            "MotherAadhar",
            "Nationality",
            "Religion",
            "Caste",
            "SubCaste",
            "EnrollmentNumber",
            "Password"
        ];

        // Create sample data for clarity (optional, or just headers)
        const sampleData = [
            {
                FirstName: "John",
                LastName: "Doe",
                Email: "john.doe@example.com",
                Phone: "9876543210",
                Gender: "Male",
                DateOfBirth: "2010-05-15",
                AdmissionDate: "2024-06-01",
                Standard: "10th",
                GRNumber: "GR12345",
                FatherName: "Mr. Doe",
                FatherPhone: "9876543211",
                MotherName: "Mrs. Doe",
                MotherPhone: "9876543212",
                Nationality: "Indian",
                EnrollmentNumber: "STU001",
                Password: "Welcome@123"
            }
        ];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });

        // Set column widths for better UX
        const wscols = headers.map(() => ({ wch: 18 }));
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
