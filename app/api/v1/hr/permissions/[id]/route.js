import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import GatePass from "@/models/GatePass";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;
        const body = await req.json();
        const { status, adminComment, securityNotes } = body;

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Permission request not found" }, { status: 404 });
        }

        await connectDB();

        const gatePass = await GatePass.findOne({ _id: id, institute: instituteId });
        if (!gatePass) {
            return NextResponse.json({ error: "Gate pass not found" }, { status: 404 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(role);

        if (status === 'CANCELLED') {
            // Requester or admin can cancel if pending
            const isOwner = gatePass.requestedBy?.toString() === session.user.id || gatePass.user?.toString() === session.user.id;
            if (!isAdmin && !isOwner) {
                return NextResponse.json({ error: "Forbidden: Not your permission request" }, { status: 403 });
            }
            if (gatePass.status !== 'PENDING' && !isAdmin) {
                return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
            }
            gatePass.status = 'CANCELLED';
            if (adminComment) gatePass.adminComment = adminComment;
        } else if (['APPROVED', 'REJECTED'].includes(status)) {
            if (!isAdmin) {
                return NextResponse.json({ error: "Only administrators and HODs can approve or reject permissions" }, { status: 403 });
            }
            gatePass.status = status;
            gatePass.approvedBy = session.user.id;
            gatePass.approvedAt = new Date();
            if (adminComment !== undefined) gatePass.adminComment = adminComment;
        } else if (['DEPARTED', 'COMPLETED'].includes(status)) {
            // Marking exit or return (by admin, staff, or gatekeeper)
            if (!isAdmin && role !== 'staff') {
                return NextResponse.json({ error: "Forbidden: Cannot update gate status" }, { status: 403 });
            }
            gatePass.status = status;
            if (status === 'DEPARTED') gatePass.departedAt = new Date();
            if (status === 'COMPLETED') gatePass.returnedAt = new Date();
            if (securityNotes !== undefined) gatePass.securityNotes = securityNotes;
        } else {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        await gatePass.save();

        const populated = await GatePass.findById(gatePass._id)
            .populate('requestedBy', 'profile.firstName profile.lastName email role')
            .populate('approvedBy', 'profile.firstName profile.lastName email role')
            .populate('user', 'profile.firstName profile.lastName email profile.phone profile.avatar');

        return NextResponse.json({ success: true, permission: populated });
    } catch (error) {
        console.error("PATCH /api/v1/hr/permissions/[id] error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Permission request not found" }, { status: 404 });
        }

        await connectDB();

        const gatePass = await GatePass.findOne({ _id: id, institute: instituteId });
        if (!gatePass) {
            return NextResponse.json({ error: "Gate pass not found" }, { status: 404 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(role);
        const isOwner = gatePass.requestedBy?.toString() === session.user.id;

        if (!isAdmin && (!isOwner || gatePass.status !== 'PENDING')) {
            return NextResponse.json({ error: "Cannot delete this permission request" }, { status: 403 });
        }

        await GatePass.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: "Permission request deleted" });
    } catch (error) {
        console.error("DELETE /api/v1/hr/permissions/[id] error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
