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

        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get("instituteId");

        // Hybrid Scoping Logic for Stats:
        // 1. If Super Admin and global view requested -> No institute filter
        // 2. Otherwise -> Scoped View (Membership OR legacy institute field)
        const isGlobalView = scope.isSuperAdmin && (targetInstParam === "all" || !targetInstParam);

        let hybridBaseQuery = { deletedAt: null };

        if (!isGlobalView) {
            const mongoose = (await import("mongoose")).default;
            const safeInstituteId = new mongoose.Types.ObjectId(scope.instituteId);

            const Membership = (await import("@/models/Membership")).default;
            const memberships = await Membership.find({
                institute: safeInstituteId,
                isActive: true
            }).select('user');
            const userIdsFromMemberships = memberships.map(m => m.user);

            hybridBaseQuery = {
                $or: [
                    { _id: { $in: userIdsFromMemberships } },
                    { institute: safeInstituteId }
                ],
                deletedAt: null
            };
        }
        // Run counts in parallel
        // 1. Students
        const studentsCountPromise = User.countDocuments({
            ...hybridBaseQuery,
            role: 'student'
        });

        // 2. Teachers (Instructors)
        const teachersCountPromise = User.countDocuments({
            ...hybridBaseQuery,
            role: 'instructor'
        });

        // 3. Staff (Admins/Other)
        const staffCountPromise = User.countDocuments({
            ...hybridBaseQuery,
            role: { $in: ['admin', 'staff'] }
        });

        // 4. Recent Admissions
        const recentAdmissionsPromise = User.find({
            ...hybridBaseQuery,
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
