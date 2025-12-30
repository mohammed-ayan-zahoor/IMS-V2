import { NextResponse } from "next/server";
import { BatchService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await BatchService.deleteBatch(id, session.user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const batch = await BatchService.updateBatch(id, body, session.user.id);
        return NextResponse.json(batch);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
