import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

// GET /api/v1/mou/submissions/[id] (Admin-only fetch single submission)
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("Failed to fetch MOU submission:", error);
        return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
    }
}

// PATCH /api/v1/mou/submissions/[id] (Admin-only status and notes updater)
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
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

// DELETE /api/v1/mou/submissions/[id] (Admin-only delete submission)
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const submission = await MouSubmission.findByIdAndDelete(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "MOU submission deleted successfully" });
    } catch (error) {
        console.error("Failed to delete MOU submission:", error);
        return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
    }
}
