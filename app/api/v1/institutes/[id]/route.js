import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import AuditLog from "@/models/AuditLog";
import mongoose from "mongoose";
// Helper to check Super Admin access
async function checkAccess() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "super_admin") {
        return { authorized: false };
    }
    return { authorized: true, session };
}

export async function GET(req, { params }) {
    try {
        const { authorized } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await connectDB();

        const institute = await Institute.findById(id);
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        return NextResponse.json({ institute });
    } catch (error) {
        console.error("Get Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { authorized, session } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        await connectDB();

        // Allowed updates via this route: status, settings, etc.
        // For now, primarily used for Suspend/Activate
        const updateData = {};
        if (body.status) {
            if (['active', 'suspended', 'inactive'].includes(body.status)) {
                updateData.status = body.status;
                // If suspending, also set isActive to false?
                // Institute model has both status and isActive.
                // status='suspended' implies isActive=false usually, but logic depends on app.
                // Let's keep them synced if needed, currently model relies on status enum.
                // Model: isActive: { type: Boolean, default: true }
                // Index: { status: 1, isActive: 1 }

                if (body.status === 'suspended' || body.status === 'inactive') {
                    updateData.isActive = false;
                } else if (body.status === 'active') {
                    updateData.isActive = true;
                }
            }
        }

        const institute = await Institute.findByIdAndUpdate(id, updateData, { new: true });

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'institute.update',
            resource: { type: 'Institute', id: institute._id },
            institute: institute._id,
            details: {
                update: updateData,
                reason: body.reason || "Admin Action"
            }
        });

        return NextResponse.json({ success: true, institute });
    } catch (error) {
        console.error("Update Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { authorized, session } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await connectDB();

        // Soft Delete
        const institute = await Institute.findByIdAndUpdate(id, {
            deletedAt: new Date(),
            isActive: false,
            status: 'inactive'
        }, { new: true });

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Cascade Soft Delete Users
        const User = mongoose.model('User');
        await User.updateMany(
            { institute: institute._id, deletedAt: null },
            {
                deletedAt: new Date(),
                deletedBy: session.user.id,
                isActive: false
            }
        );

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'institute.delete', // Make sure this is in enum (we added it!)
            resource: { type: 'Institute', id: institute._id },
            institute: institute._id,
            details: {
                type: 'soft-delete'
            }
        });

        return NextResponse.json({ success: true, message: "Institute deleted successfully" });
    } catch (error) {
        console.error("Delete Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
