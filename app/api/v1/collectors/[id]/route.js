import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Collector from "@/models/Collector";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid collector ID" }, { status: 400 });
        }

        await connectDB();
        const collector = await Collector.findOne({
            _id: id,
            institute: session.user.institute.id
        });

        if (!collector) return NextResponse.json({ error: "Collector not found" }, { status: 404 });

        // Soft delete/deactivate
        collector.isActive = false;
        await collector.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'collector.delete',
            resource: { type: 'Collector', id: collector._id },
            institute: session.user.institute.id,
            details: { name: collector.name }
        });


        return NextResponse.json({ message: "Collector removed" });
    } catch (error) {
        console.error("Error deleting collector:", error);
        return NextResponse.json({ error: "Failed to delete collector" }, { status: 500 });
    }
}
