import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import HRSettings from "@/models/HRSettings";
import Department from "@/models/Department";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor", "staff"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get("batchId");
        const isStaff = searchParams.get("staff") === "true";
        const instituteId = session.user.institute?.id || session.user.institute;

        let users = [];

        if (isStaff) {
            // Fetch instructors & staff with faceDescriptor and department
            users = await User.find({
                role: { $in: ["instructor", "staff", "admin"] },
                institute: instituteId,
                deletedAt: null
            })
                .populate("department", "name code shiftTimings")
                .select("+faceDescriptor profile enrollmentNumber email role department")
                .lean();
        } else if (batchId && batchId !== "all") {
            // Fetch students belonging to the batch
            const batch = await Batch.findById(batchId).select("enrolledStudents").lean();
            if (!batch) {
                return NextResponse.json({ error: "Batch not found" }, { status: 404 });
            }

            // enrolledStudents is [{student: ObjectId, ...}]
            const studentIds = (batch.enrolledStudents || []).map(e => e.student).filter(Boolean);

            users = await User.find({
                _id: { $in: studentIds },
                deletedAt: null
            })
                .select("+faceDescriptor profile enrollmentNumber email role")
                .lean();
        } else {
            // Fetch all active batches to map students to batch IDs
            const activeBatches = await Batch.find({
                institute: instituteId,
                deletedAt: null
            }).select("enrolledStudents").lean();

            const studentToBatchMap = {};
            activeBatches.forEach(b => {
                (b.enrolledStudents || []).forEach(e => {
                    if (e.student) {
                        studentToBatchMap[e.student.toString()] = b._id.toString();
                    }
                });
            });

            users = await User.find({
                institute: instituteId,
                deletedAt: null
            })
                .select("+faceDescriptor profile enrollmentNumber email role")
                .lean();

            users.forEach(u => {
                u.batchId = studentToBatchMap[u._id.toString()] || null;
            });
        }

        // If staff, fetch HR settings for fallback institute shift timings
        let hrSettings = null;
        if (isStaff) {
            hrSettings = await HRSettings.findOne({ institute: instituteId }).lean();
        }

        // Map to lightweight descriptors list
        const descriptors = users.map(u => {
            let effectiveShift = null;
            if (isStaff) {
                const deptShift = u.department?.shiftTimings;
                const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);
                effectiveShift = hasCustomDeptShift ? {
                    isDepartmentShift: true,
                    departmentName: u.department.name,
                    shiftStart: deptShift.shiftStart || "09:00",
                    shiftEnd: deptShift.shiftEnd || "18:00",
                    checkInGraceMins: deptShift.checkInGraceMins ?? 15,
                    checkOutGraceMins: deptShift.checkOutGraceMins ?? 10
                } : {
                    isDepartmentShift: false,
                    departmentName: u.department?.name || null,
                    shiftStart: hrSettings?.shiftStart || "09:00",
                    shiftEnd: hrSettings?.shiftEnd || "18:00",
                    checkInGraceMins: hrSettings?.checkInGraceMins ?? 15,
                    checkOutGraceMins: hrSettings?.checkOutGraceMins ?? 10
                };
            }

            return {
                id: u._id.toString(),
                name: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.email,
                enrollmentNumber: u.enrollmentNumber || "",
                email: u.email,
                role: u.role,
                department: u.department ? {
                    id: u.department._id?.toString(),
                    name: u.department.name,
                    code: u.department.code
                } : null,
                effectiveShift,
                avatar: u.profile?.avatar || null,
                batchId: u.batchId || (batchId && batchId !== "all" ? batchId : null),
                faceDescriptor: u.faceDescriptor && u.faceDescriptor.length > 0 ? Array.from(u.faceDescriptor) : null
            };
        });

        return NextResponse.json({ descriptors });
    } catch (error) {
        console.error("Fetch Descriptors Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
