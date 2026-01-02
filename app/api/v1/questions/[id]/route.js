import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const question = await Question.findById(id).lean();
        if (!question) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(question, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ question });
    } catch (error) {
        console.error("Error fetching question:", error);
        return NextResponse.json({ error: "Failed to fetch question" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        const question = await Question.findById(id);
        if (!question) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(question, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Sanitize Input (Whitelist)
        // Only allow updating certain fields
        const updates = {};
        const allowedUpdates = ['text', 'type', 'difficulty', 'marks', 'correctAnswer', 'options', 'explanation', 'course', 'batch', 'subject', 'classLevel', 'tags', 'isActive'];

        allowedUpdates.forEach(field => {
            if (body[field] !== undefined) {
                // Sanitize Empty ObjectIds
                if ((field === 'course' || field === 'batch') && body[field] === "") {
                    updates[field] = null;
                } else {
                    updates[field] = body[field];
                }
            }
        });

        const updatedQuestion = await Question.findByIdAndUpdate(id, { $set: updates }, { new: true });

        return NextResponse.json({ question: updatedQuestion });

    } catch (error) {
        console.error("Error updating question:", error);
        return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const question = await Question.findById(id);
        if (!question) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(question, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await Question.findByIdAndDelete(id);

        return NextResponse.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.error("Error deleting question:", error);
        return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
}
