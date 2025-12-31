import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const material = await Material.findOne({ _id: id, deletedAt: null })
            .populate('course', 'name')
            .populate('batches', 'name');

        if (!material) {
            return NextResponse.json({ error: "Material not found" }, { status: 404 });
        }

        return NextResponse.json({ material });

    } catch (error) {
        console.error("GET Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        delete body.uploadedBy; // Prevent changing owner
        delete body.createdAt;
        delete body.deletedAt; // Prevent manual restoration

        const material = await Material.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

        return NextResponse.json({ success: true, material });

    } catch (error) {
        console.error("Update Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const material = await Material.findByIdAndUpdate(
            id,
            { deletedAt: new Date() },
            { new: true }
        );

        if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

        return NextResponse.json({ success: true, message: "Material deleted" });

    } catch (error) {
        console.error("Delete Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
