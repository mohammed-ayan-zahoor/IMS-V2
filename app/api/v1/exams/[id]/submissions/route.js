import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ExamSubmission from "@/models/ExamSubmission";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        const submissions = await ExamSubmission.find({ exam: id })
            .populate("student", "profile email enrollmentNumber") // Populate profile for virtual fullName
            .sort({ score: -1 }); // Sort by highest score by default

        return NextResponse.json({ submissions });

    } catch (error) {
        console.error("Fetch Submissions Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
