import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Designation from "@/models/Designation";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const designations = await Designation.find({ institute: instituteId, deletedAt: null })
            .sort({ name: 1 });

        return NextResponse.json({ designations });
    } catch (error) {
        console.error("Failed to fetch designations:", error);
        return NextResponse.json({ error: "Failed to fetch designations" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await connectDB();
        const designation = await Designation.create({
            institute: instituteId,
            name: name.trim(),
            description: description?.trim()
        });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.designation.create',
                resource: { type: 'Designation', id: designation._id },
                institute: instituteId,
                details: { name: designation.name }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ designation });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A designation with this name already exists" }, { status: 400 });
        }
        console.error('Failed to create designation:', error);
        return NextResponse.json({ error: "Failed to create designation" }, { status: 500 });
    }
}
