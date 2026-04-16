import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins and super_admins can view analytics
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can view analytics" },
        { status: 403 }
      );
    }

    await connectDB();

    let query = { role: "student" };

    // For admin role, filter by their institute
    if (session.user.role === "admin") {
      query.institute = session.user.instituteId;
    }

    // Get all students
    const students = await User.find(query);

    // Calculate metrics
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === "ACTIVE").length;
    const completedStudents = students.filter((s) => s.status === "COMPLETED").length;
    const droppedStudents = students.filter((s) => s.status === "DROPPED").length;

    const completionRate =
      totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
    const dropoutRate =
      totalStudents > 0 ? Math.round((droppedStudents / totalStudents) * 100) : 0;

    // Status distribution
    const statusDistribution = [
      { name: "Active", value: activeStudents },
      { name: "Completed", value: completedStudents },
      { name: "Dropped", value: droppedStudents },
    ];

    // Monthly trends (last 6 months)
    const monthlyTrends = getMonthlyTrends(students);

    // Completion by reason
    const completionByReason = getCompletionByReason(students);

    return Response.json({
      totalStudents,
      activeStudents,
      completedStudents,
      droppedStudents,
      completionRate,
      dropoutRate,
      statusDistribution,
      monthlyTrends,
      completionByReason,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function getMonthlyTrends(students) {
  const months = [];
  const now = new Date();

  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("en-US", {
      month: "short",
    });

    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthStudents = students.filter((s) => {
      const completedAt = s.completedAt ? new Date(s.completedAt) : null;
      return completedAt && completedAt >= monthStart && completedAt <= monthEnd;
    });

    const completed = monthStudents.filter((s) => s.status === "COMPLETED").length;
    const active = students.filter((s) => s.status === "ACTIVE").length;
    const dropped = students.filter((s) => s.status === "DROPPED").length;

    months.push({
      month: monthName,
      completed,
      active,
      dropped,
    });
  }

  return months;
}

function getCompletionByReason(students) {
  const reasonMap = {};

  students
    .filter((s) => s.status === "COMPLETED" && s.completionReason)
    .forEach((s) => {
      const reason = s.completionReason;
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });

  return Object.entries(reasonMap)
    .map(([reason, count]) => ({
      reason,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
