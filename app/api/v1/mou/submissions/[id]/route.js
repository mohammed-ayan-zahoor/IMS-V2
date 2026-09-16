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

        // Apply updates safely
        if (schoolName !== undefined) submission.schoolName = schoolName.trim();
        if (city !== undefined) submission.city = (city || "").trim();
        if (principalName !== undefined) submission.principalName = principalName.trim();
        if (designation !== undefined) submission.designation = (designation || "Principal").trim();
        if (contactEmail !== undefined) submission.contactEmail = contactEmail.trim().toLowerCase();
        if (contactPhone !== undefined) submission.contactPhone = (contactPhone || "").trim();
        if (studentCount !== undefined) submission.studentCount = Number(studentCount);
        if (udiseCode !== undefined) submission.udiseCode = (udiseCode || "").trim();
        if (address !== undefined) submission.address = (address || "").trim();
        if (totalPrice !== undefined) submission.totalPrice = Number(totalPrice);
        if (upfrontPrice !== undefined) submission.upfrontPrice = Number(upfrontPrice);
        if (mouDuration !== undefined) submission.mouDuration = Number(mouDuration);
        if (perStudentRate !== undefined) submission.perStudentRate = Number(perStudentRate);
        if (planType !== undefined && ['standard', 'plus', 'custom'].includes(planType)) {
            submission.planType = planType;
        }
        if (instituteType !== undefined && ['school', 'college_degree', 'college_pu'].includes(instituteType)) {
            submission.instituteType = instituteType;
        }
        if (yearWiseCounts !== undefined) {
            submission.yearWiseCounts = yearWiseCounts;
        }
        if (coupon !== undefined) {
            submission.coupon = (coupon || "").trim().toUpperCase();
        }
        if (action !== undefined && ['print', 'download_pdf', 'manual_entry'].includes(action)) {
            submission.action = action;
        }

        if (status !== undefined) {
            if (!['new', 'contacted', 'converted', 'rejected'].includes(status)) {
                return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
            }
            submission.status = status;
        }

        if (notes !== undefined) {
            submission.notes = notes;
        }

        await submission.save();

        return NextResponse.json({ success: true, submission });
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

        const submission = await MouSubmission.findByIdAndDelete(id);
        if (!submission) {
            return NextResponse.json({ error: "MOU submission not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "MOU submission deleted successfully" });
    } catch (error) {
        console.error("Failed to delete MOU submission:", error);
        return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
    }
}
