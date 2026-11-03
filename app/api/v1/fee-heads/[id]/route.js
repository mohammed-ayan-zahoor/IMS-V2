import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FeeHead from "@/models/FeeHead";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const { id } = resolvedParams;

        const body = await req.json();
        const { name, code, category, isDefaultApplied, isActive, description } = body;

        await connectDB();

        const feeHead = await FeeHead.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!feeHead) {
            return NextResponse.json({ error: "Fee head not found" }, { status: 404 });
        }

        if (name && name.trim() !== feeHead.name) {
            const cleanName = name.trim();
            const duplicate = await FeeHead.findOne({
                _id: { $ne: id },
                institute: scope.instituteId,
                name: { $regex: new RegExp(`^${cleanName}$`, "i") },
                deletedAt: null
            });
            if (duplicate) {
                return NextResponse.json({ error: `A fee head named "${cleanName}" already exists.` }, { status: 400 });
            }
            feeHead.name = cleanName;
        }

        if (code !== undefined) feeHead.code = code.trim().toUpperCase();
        if (category !== undefined) feeHead.category = category;
        if (isDefaultApplied !== undefined) feeHead.isDefaultApplied = Boolean(isDefaultApplied);
        if (isActive !== undefined) feeHead.isActive = Boolean(isActive);
        if (description !== undefined) feeHead.description = description.trim();

        await feeHead.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'feeHead.update',
            resource: { type: 'FeeHead', id: feeHead._id },
            institute: scope.instituteId,
            details: { name: feeHead.name, isActive: feeHead.isActive }
        });

        return NextResponse.json({ feeHead });
    } catch (error) {
        console.error("API Error [FeeHead PATCH]:", error);
        return NextResponse.json({ error: error.message || "Failed to update fee head" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const { id } = resolvedParams;

        await connectDB();

        const feeHead = await FeeHead.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { $set: { deletedAt: new Date() } },
            { new: true }
        );

        if (!feeHead) {
            return NextResponse.json({ error: "Fee head not found" }, { status: 404 });
        }

        await createAuditLog({
            actor: session.user.id,
            action: 'feeHead.delete',
            resource: { type: 'FeeHead', id: feeHead._id },
            institute: scope.instituteId,
            details: { name: feeHead.name }
        });

        return NextResponse.json({ message: "Fee head deleted successfully" });
    } catch (error) {
        console.error("API Error [FeeHead DELETE]:", error);
        return NextResponse.json({ error: error.message || "Failed to delete fee head" }, { status: 500 });
    }
}
