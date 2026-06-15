import { NextResponse } from "next/server";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelAllotment from "@/models/HostelAllotment";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const allotment = await HostelAllotment.findOne({ _id: id, deletedAt: null });
        if (!allotment) {
            return NextResponse.json({ error: "Allotment not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(allotment, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { status, vacatingDate, notes, installments } = body;

        const updateData = {};
        if (status !== undefined) {
            if (!['active', 'vacated', 'suspended'].includes(status)) {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }
            updateData.status = status;
            if (status === 'vacated') {
                updateData.vacatingDate = vacatingDate ? new Date(vacatingDate) : new Date();
            } else if (status === 'active') {
                updateData.vacatingDate = null;
            }
        }
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Handle raw installments updates if needed (e.g. updating due dates or amounts)
        // If updating installments, make sure to let mongoose save run to trigger the pre-save hook
        let updatedAllotment;
        if (installments !== undefined && Array.isArray(installments)) {
            allotment.installments = installments;
            if (status !== undefined) {
                allotment.status = updateData.status;
                if (updateData.vacatingDate !== undefined) allotment.vacatingDate = updateData.vacatingDate;
            }
            if (notes !== undefined) allotment.notes = updateData.notes;
            
            updatedAllotment = await allotment.save();
        } else {
            updatedAllotment = await HostelAllotment.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            ).populate('student', 'profile.firstName profile.lastName enrollmentNumber')
             .populate('room', 'roomNumber type')
             .populate('block', 'name');
        }

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: status === 'vacated' ? 'hostel.allotment.vacate' : 'hostel.allotment.update',
                resource: { type: 'HostelAllotment', id: allotment._id },
                institute: scope.instituteId,
                details: { before: allotment.toObject(), after: updatedAllotment.toObject() }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ allotment: updatedAllotment });
    } catch (error) {
        console.error("PATCH /api/v1/hostel/allotments/[id] error:", error);
        return NextResponse.json({ error: "Failed to update allotment" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const allotment = await HostelAllotment.findOne({ _id: id, deletedAt: null });
        if (!allotment) {
            return NextResponse.json({ error: "Allotment not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(allotment, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Soft delete allotment
        allotment.deletedAt = new Date();
        await allotment.save();

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.allotment.delete',
                resource: { type: 'HostelAllotment', id: allotment._id },
                institute: scope.instituteId,
                details: { student: allotment.student }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ success: true, message: "Allotment deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/hostel/allotments/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete allotment" }, { status: 500 });
    }
}
