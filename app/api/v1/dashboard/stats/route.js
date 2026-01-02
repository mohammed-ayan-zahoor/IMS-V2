import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Base query with strict institute scoping
        const baseQuery = addInstituteFilter({ deletedAt: null }, scope);

        // Run counts in parallel (fast)
        // 1. Students
        const studentsCountPromise = User.countDocuments({
            ...baseQuery,
            role: 'student'
        });

        // 2. Teachers (Instructors)
        const teachersCountPromise = User.countDocuments({
            ...baseQuery,
            role: 'instructor'
        });

        // 3. Staff (Admins/Other)
        // We consider 'admin' and 'super_admin' (if any assigned) as staff.
        // Usually system super_admin isn't in institute, but if they are, count them.
        const staffCountPromise = User.countDocuments({
            ...baseQuery,
            role: { $in: ['admin', 'staff'] }
        });

        // 4. Recent Admissions
        // Last 5 students created
        const recentAdmissionsPromise = User.find({
            ...baseQuery,
            role: 'student'
        })
            .select('profile.firstName profile.lastName email role createdAt enrollmentNumber')
            .sort({ createdAt: -1 })
            .limit(5);

        const [studentsCount, teachersCount, staffCount, recentAdmissions] = await Promise.all([
            studentsCountPromise,
            teachersCountPromise,
            staffCountPromise,
            recentAdmissionsPromise
        ]);

        return NextResponse.json({
            counts: {
                students: studentsCount,
                teachers: teachersCount,
                staff: staffCount,
                awards: 0 // Placeholder until Awards feature exists
            },
            recentAdmissions
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
