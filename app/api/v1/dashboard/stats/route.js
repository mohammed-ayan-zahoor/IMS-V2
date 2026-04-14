import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Enquiry from "@/models/Enquiry";
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get("instituteId");

        const isGlobalView = scope.isSuperAdmin && (targetInstParam === "all" || !targetInstParam);

        let hybridBaseQuery = { deletedAt: null };
        let instituteQuery = { deletedAt: null };

        if (!isGlobalView) {
            const safeInstituteId = new mongoose.Types.ObjectId(scope.instituteId);
            instituteQuery.institute = safeInstituteId;

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

        // Parallel stats retrieval
        // 1. User Counts (Students, Staff)
        const studentsCountPromise = User.countDocuments({ ...hybridBaseQuery, role: 'student' });
        const staffCountPromise = User.countDocuments({ ...hybridBaseQuery, role: { $in: ['admin', 'staff'] } });

        // 2. Total Enrollments (Sum of student counts across all active batches)
        const totalEnrollmentsPromise = Batch.aggregate([
            { $match: instituteQuery },
            { $project: { enrollmentCount: { $size: { $ifNull: ["$enrolledStudents", []] } } } },
            { $group: { _id: null, total: { $sum: "$enrollmentCount" } } }
        ]);

        // 3. Enquiry Count
        const enquiriesCountPromise = Enquiry.countDocuments(instituteQuery);

        // 4. Top Courses (Leaderboard)
        const topCoursesPromise = Batch.aggregate([
            { $match: instituteQuery },
            { $project: { course: 1, enrollmentCount: { $size: { $ifNull: ["$enrolledStudents", []] } } } },
            { $group: { _id: "$course", totalStudents: { $sum: "$enrollmentCount" } } },
            { $sort: { totalStudents: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "courses",
                    localField: "_id",
                    foreignField: "_id",
                    as: "courseData"
                }
            },
            { $unwind: "$courseData" },
            {
                $project: {
                    _id: 1,
                    name: "$courseData.name",
                    totalStudents: 1
                }
            }
        ]);

        // 5. Recent Admissions
        const recentAdmissionsPromise = User.find({ ...hybridBaseQuery, role: 'student' })
            .select('profile.firstName profile.lastName email role createdAt enrollmentNumber')
            .sort({ createdAt: -1 })
            .limit(5);

        const [
            studentsCount, 
            staffCount, 
            totalEnrollmentsResult, 
            enquiriesCount, 
            topCourses, 
            recentAdmissions
        ] = await Promise.all([
            studentsCountPromise,
            staffCountPromise,
            totalEnrollmentsPromise,
            enquiriesCountPromise,
            topCoursesPromise,
            recentAdmissionsPromise
        ]);

        return NextResponse.json({
            counts: {
                students: studentsCount,
                coursesEnrolled: totalEnrollmentsResult[0]?.total || 0,
                staff: staffCount,
                enquiries: enquiriesCount
            },
            topCourses,
            recentAdmissions
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
