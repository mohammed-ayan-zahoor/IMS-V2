import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SharedLink from "@/models/SharedLink";

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const deletedLink = await SharedLink.findByIdAndDelete(id);

        if (!deletedLink) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Link deleted successfully" });
    } catch (error) {
        console.error("Delete Shared Link Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const updatedLink = await SharedLink.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true }
        );

        if (!updatedLink) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, link: updatedLink });
    } catch (error) {
        console.error("Patch Shared Link Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
