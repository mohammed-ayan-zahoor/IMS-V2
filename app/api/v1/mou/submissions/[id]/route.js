import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

// PATCH /api/v1/mou/submissions/[id] (Admin-only status and notes updater)
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const { status, notes } = body;

        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // Apply updates safely
        if (status !== undefined) {
            if (!['new', 'contacted', 'converted', 'rejected'].includes(status)) {
                return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
            }
            submission.status = status;
        }

        if (notes !== undefined) {
            submission.notes = notes;
        }

        await submission.save();

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("Failed to update MOU submission:", error);
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }
}
