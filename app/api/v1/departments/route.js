import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import Course from "@/models/Course";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * @route   GET /api/v1/departments
 * @desc    Get all active departments with HOD details, course/faculty counts & eligible HOD list
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.institute?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const instituteId = new mongoose.Types.ObjectId(session.user.institute.id);

        const [departments, instructors, courseCounts, facultyCounts] = await Promise.all([
            Department.find({ institute: instituteId, deletedAt: null })
                .populate("hod", "profile.firstName profile.lastName profile.avatar email profile.phone")
                .sort({ name: 1 })
                .lean(),
            User.find({
                institute: instituteId,
                role: { $in: ["instructor", "staff", "admin"] },
                deletedAt: null
            })
                .select("profile.firstName profile.lastName profile.avatar email role")
                .sort({ "profile.firstName": 1 })
                .lean(),
            Course.aggregate([
                { $match: { institute: instituteId, deletedAt: null, department: { $ne: null } } },
                { $group: { _id: "$department", count: { $sum: 1 } } }
            ]),
            User.aggregate([
                { $match: { institute: instituteId, deletedAt: null, department: { $ne: null } } },
                { $group: { _id: "$department", count: { $sum: 1 } } }
            ])
        ]);

        const courseCountMap = new Map(courseCounts.map(c => [c._id.toString(), c.count]));
        const facultyCountMap = new Map(facultyCounts.map(f => [f._id.toString(), f.count]));

        const enrichedDepartments = departments.map(dept => ({
            ...dept,
            courseCount: courseCountMap.get(dept._id.toString()) || 0,
            facultyCount: facultyCountMap.get(dept._id.toString()) || 0
        }));

        return NextResponse.json({
            departments: enrichedDepartments,
            instructors
        });

    } catch (error) {
        console.error("[DEPARTMENTS_GET_ERROR]", error);
        return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/departments
 * @desc    Create a new department
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.institute?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const instituteId = new mongoose.Types.ObjectId(session.user.institute.id);

        if (!body.name?.trim() || !body.code?.trim()) {
            return NextResponse.json({ error: "Department Name and Code are required." }, { status: 400 });
        }

        const normalizedCode = body.code.trim().toUpperCase();

        const existing = await Department.findOne({
            institute: instituteId,
            code: normalizedCode,
            deletedAt: null
        }).lean();

        if (existing) {
            return NextResponse.json({ error: `Department code '${normalizedCode}' already exists.` }, { status: 409 });
        }

        let hodId = null;
        if (body.hod && mongoose.Types.ObjectId.isValid(body.hod)) {
            hodId = new mongoose.Types.ObjectId(body.hod);
        }

        const newDepartment = await Department.create({
            institute: instituteId,
            name: body.name.trim(),
            code: normalizedCode,
            description: body.description?.trim() || "",
            hod: hodId,
            establishedYear: body.establishedYear ? Number(body.establishedYear) : undefined,
            contactEmail: body.contactEmail?.trim()?.toLowerCase() || "",
            contactPhone: body.contactPhone?.trim() || "",
            isActive: body.isActive !== false,
            createdBy: new mongoose.Types.ObjectId(session.user.id)
        });

        if (hodId) {
            await User.findByIdAndUpdate(hodId, { department: newDepartment._id });
        }

        const populated = await Department.findById(newDepartment._id)
            .populate("hod", "profile.firstName profile.lastName profile.avatar email profile.phone")
            .lean();

        return NextResponse.json({
            message: "Department created successfully",
            department: { ...populated, courseCount: 0, facultyCount: 0 }
        }, { status: 201 });

    } catch (error) {
        console.error("[DEPARTMENTS_POST_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to create department" }, { status: 500 });
    }
}
