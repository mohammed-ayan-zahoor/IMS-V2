import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FeePreset from "@/models/FeePreset";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        const { id } = await params;

        const body = await req.json();
        await connectDB();

        // Optional: Validate that subjects exist if provided in update
        if (body.subjects && Array.isArray(body.subjects) && body.subjects.length > 0) {
            const Subject = (await import("@/models/Subject")).default;
            const validSubjects = await Subject.find({
                _id: { $in: body.subjects },
                institute: scope.instituteId,
                deletedAt: null
            });
            if (validSubjects.length !== body.subjects.length) {
                return NextResponse.json({ error: "One or more invalid subject IDs provided" }, { status: 400 });
            }
        }

        const preset = await FeePreset.findOneAndUpdate(
            { _id: id, institute: scope.instituteId },
            { $set: body },
            { new: true }
        );

        if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'fee_preset.update',
            resource: { type: 'FeePreset', id: preset._id },
            institute: scope.instituteId,
            details: body
        });

        return NextResponse.json({ preset });

    } catch (error) {
        console.error("API Error [FeePresets PATCH]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        const { id } = await params;

        await connectDB();
        const preset = await FeePreset.findOneAndUpdate(
            { _id: id, institute: scope.instituteId },
            { $set: { deletedAt: new Date(), isActive: false } },
            { new: true }
        );

        if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'fee_preset.delete',
            resource: { type: 'FeePreset', id: preset._id },
            institute: scope.instituteId,
            details: { name: preset.name }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("API Error [FeePresets DELETE]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
