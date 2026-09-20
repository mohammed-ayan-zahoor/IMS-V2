import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

// GET /api/v1/mou/submissions/[id] (Admin-only fetch single submission)
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // Auto-heal legacy record if needed
        const count = submission.studentCount || 0;
        const duration = submission.mouDuration || 1;
        if (count > 0 && duration > 1 && submission.totalPrice === count * 59) {
            let upfrontPercent = 0.5;
            if (count <= 500) upfrontPercent = 1;
            else if (count <= 1000) upfrontPercent = 0.75;

            submission.totalPrice = count * 59 * duration;
            submission.upfrontPrice = submission.totalPrice * upfrontPercent;
            await submission.save().catch(e => console.error("Auto-heal MouSubmission error:", e));
        }

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("Failed to fetch MOU submission:", error);
        return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
    }
}

// PATCH /api/v1/mou/submissions/[id] (Admin-only status, notes and full submission editor)
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const {
            schoolName,
            city,
            principalName,
            designation,
            contactEmail,
            contactPhone,
            studentCount,
            udiseCode,
            address,
            totalPrice,
            upfrontPrice,
            mouDuration,
            perStudentRate,
            planType,
            instituteType,
            yearWiseCounts,
            coupon,
            action,
            status,
            notes
        } = body;

        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // Build update object safely
        const updateFields = {};
        if (schoolName !== undefined) updateFields.schoolName = schoolName.trim();
        if (city !== undefined) updateFields.city = (city || "").trim();
        if (principalName !== undefined) updateFields.principalName = principalName.trim();
        if (designation !== undefined) updateFields.designation = (designation || "Principal").trim();
        if (contactEmail !== undefined) updateFields.contactEmail = contactEmail.trim().toLowerCase();
        if (contactPhone !== undefined) updateFields.contactPhone = (contactPhone || "").trim();
        if (studentCount !== undefined) updateFields.studentCount = Number(studentCount);
        if (udiseCode !== undefined) updateFields.udiseCode = (udiseCode || "").trim();
        if (address !== undefined) updateFields.address = (address || "").trim();
        if (totalPrice !== undefined) updateFields.totalPrice = Number(totalPrice);
        if (upfrontPrice !== undefined) updateFields.upfrontPrice = Number(upfrontPrice);
        if (mouDuration !== undefined) updateFields.mouDuration = Number(mouDuration);
        if (perStudentRate !== undefined) updateFields.perStudentRate = Number(perStudentRate);
        if (planType !== undefined && ['standard', 'plus', 'custom'].includes(planType)) {
            updateFields.planType = planType;
        }
        if (instituteType !== undefined && ['school', 'college_degree', 'college_pu'].includes(instituteType)) {
            updateFields.instituteType = instituteType;
        }
        if (yearWiseCounts !== undefined) {
            updateFields.yearWiseCounts = yearWiseCounts;
        }
        if (coupon !== undefined) {
            updateFields.coupon = (coupon || "").trim().toUpperCase();
        }
        if (action !== undefined && ['print', 'download_pdf', 'manual_entry'].includes(action)) {
            updateFields.action = action;
        }

        if (status !== undefined) {
            if (!['new', 'contacted', 'converted', 'rejected'].includes(status)) {
                return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
            }
            updateFields.status = status;
        }

        if (notes !== undefined) {
            updateFields.notes = notes;
        }

        // ponytail: Update all documents sharing this refId to ensure legacy duplicate events remain in sync
        const filter = submission.refId ? { refId: submission.refId } : { _id: id };
        const updateResult = await MouSubmission.updateMany(filter, { $set: updateFields });
        const updatedSubmission = await MouSubmission.findById(id);

        return NextResponse.json({
            success: true,
            submission: updatedSubmission,
            updatedCount: updateResult.modifiedCount
        });
    } catch (error) {
        console.error("Failed to update MOU submission:", error);
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }
}

// DELETE /api/v1/mou/submissions/[id] (Admin-only delete submission)
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const submission = await MouSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        // ponytail: Delete all documents sharing this refId so legacy duplicate records do not leave orphans
        const filter = submission.refId ? { refId: submission.refId } : { _id: id };
        const deleteResult = await MouSubmission.deleteMany(filter);

        return NextResponse.json({
            success: true,
            message: "MOU submission deleted successfully",
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error("Failed to delete MOU submission:", error);
        return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
    }
}
