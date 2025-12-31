import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Exam from "@/models/Exam";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const exam = await Exam.findById(id)
            .populate("course", "name code")
            .populate("batches", "name")
            .populate("questions");

        if (!exam || exam.deletedAt) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ exam });

    } catch (error) {
        console.error("Fetch Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        // DEBUG: Check schema type
        console.log("DEBUG: Exam Schema Questions Type:", Exam.schema.path('questions').instance);
        console.log("DEBUG: Exam Schema Questions Caster:", Exam.schema.path('questions').caster ? Exam.schema.path('questions').caster.instance : 'No Caster');

        // Prevent deletion via PATCH
        delete body.deletedAt;
        delete body.createdBy;

        const exam = await Exam.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, exam });

    } catch (error) {
        console.error("Update Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Soft delete
        const exam = await Exam.findByIdAndUpdate(
            id,
            { deletedAt: new Date() },
            { new: true }
        );

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Exam deleted" });

    } catch (error) {
        console.error("Delete Exam Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
