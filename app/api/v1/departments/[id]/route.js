import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * @route   GET /api/v1/departments/[id]
 * @desc    Get single department details
 */
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.institute?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Department ID" }, { status: 400 });
        }

        await connectDB();
        const instituteId = new mongoose.Types.ObjectId(session.user.institute.id);

        const department = await Department.findOne({
            _id: new mongoose.Types.ObjectId(id),
            institute: instituteId,
            deletedAt: null
        })
            .populate("hod", "profile.firstName profile.lastName profile.avatar email profile.phone")
            .lean();

        if (!department) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        return NextResponse.json({ department });

    } catch (error) {
        console.error("[DEPARTMENT_GET_BY_ID_ERROR]", error);
        return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 });
    }
}

/**
 * @route   PUT /api/v1/departments/[id]
 * @desc    Update a department
 */
export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.institute?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Department ID" }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();
        const instituteId = new mongoose.Types.ObjectId(session.user.institute.id);
        const deptId = new mongoose.Types.ObjectId(id);

        const currentDept = await Department.findOne({
            _id: deptId,
            institute: instituteId,
            deletedAt: null
        });

        if (!currentDept) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        // If code is being changed, verify uniqueness
        if (body.code) {
            const normalizedCode = body.code.trim().toUpperCase();
            if (normalizedCode !== currentDept.code) {
                const existing = await Department.findOne({
                    _id: { $ne: deptId },
                    institute: instituteId,
                    code: normalizedCode,
                    deletedAt: null
                }).lean();

                if (existing) {
                    return NextResponse.json({ error: `Department code '${normalizedCode}' is already in use.` }, { status: 409 });
                }
                currentDept.code = normalizedCode;
            }
        }

        if (body.name?.trim()) currentDept.name = body.name.trim();
        if (body.description !== undefined) currentDept.description = body.description.trim();
        if (body.establishedYear !== undefined) currentDept.establishedYear = body.establishedYear ? Number(body.establishedYear) : null;
        if (body.contactEmail !== undefined) currentDept.contactEmail = body.contactEmail.trim().toLowerCase();
        if (body.contactPhone !== undefined) currentDept.contactPhone = body.contactPhone.trim();
        if (body.isActive !== undefined) currentDept.isActive = Boolean(body.isActive);

        // Handle HOD assignment change
        if (body.hod !== undefined) {
            const oldHodId = currentDept.hod;
            const newHodId = body.hod && mongoose.Types.ObjectId.isValid(body.hod)
                ? new mongoose.Types.ObjectId(body.hod)
                : null;

            currentDept.hod = newHodId;

            if (newHodId && String(newHodId) !== String(oldHodId)) {
                await User.findByIdAndUpdate(newHodId, { department: deptId });
            }
        }

        await currentDept.save();

        const updated = await Department.findById(deptId)
            .populate("hod", "profile.firstName profile.lastName profile.avatar email profile.phone")
            .lean();

        return NextResponse.json({
            message: "Department updated successfully",
            department: updated
        });

    } catch (error) {
        console.error("[DEPARTMENT_PUT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to update department" }, { status: 500 });
    }
}

/**
 * @route   DELETE /api/v1/departments/[id]
 * @desc    Soft delete a department
 */
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.institute?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Department ID" }, { status: 400 });
        }

        await connectDB();
        const instituteId = new mongoose.Types.ObjectId(session.user.institute.id);
        const deptId = new mongoose.Types.ObjectId(id);

        const department = await Department.findOne({
            _id: deptId,
            institute: instituteId,
            deletedAt: null
        });

        if (!department) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        department.deletedAt = new Date();
        department.isActive = false;
        await department.save();

        return NextResponse.json({ message: "Department deleted successfully" });

    } catch (error) {
        console.error("[DEPARTMENT_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
    }
}
