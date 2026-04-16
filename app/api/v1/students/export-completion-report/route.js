import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins and super_admins can export reports
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can export reports" },
        { status: 403 }
      );
    }

    const { filters = {} } = await req.json();

    await connectDB();

    let query = { role: "student" };

    // For admin role, filter by their institute
    if (session.user.role === "admin") {
      query.institute = session.user.instituteId;
    }

    // Apply optional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      query.completedAt = {};
      if (filters.startDate) {
        query.completedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.completedAt.$lte = new Date(filters.endDate);
      }
    }

    // Fetch students
    const students = await User.find(query).select(
      "name email status completedAt completionReason certificateId createdAt"
    );

    // Generate CSV content
    const csvContent = generateCSV(students);

    // Return CSV as file download
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="completion-report-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export completion report error:", error);
    return Response.json(
      { error: error.message || "Failed to export report" },
      { status: 500 }
    );
  }
}

function generateCSV(students) {
  const headers = [
    "Name",
    "Email",
    "Status",
    "Completed Date",
    "Completion Reason",
    "Certificate Generated",
    "Enrolled Date",
  ];

  const rows = students.map((student) => [
    `"${(student.name || "").replace(/"/g, '""')}"`,
    `"${(student.email || "").replace(/"/g, '""')}"`,
    student.status || "ACTIVE",
    student.completedAt
      ? new Date(student.completedAt).toLocaleDateString("en-US")
      : "N/A",
    `"${(student.completionReason || "").replace(/"/g, '""')}"`,
    student.certificateId ? "Yes" : "No",
    student.createdAt
      ? new Date(student.createdAt).toLocaleDateString("en-US")
      : "N/A",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}
