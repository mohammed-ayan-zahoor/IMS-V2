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

        let hybridBaseQuery = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
        let instituteQuery = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

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
                $and: [
                    {
                        $or: [
                            { _id: { $in: userIdsFromMemberships } },
                            { institute: safeInstituteId }
                        ]
                    },
                    { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }
                ]
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

        // 6. Revenue Trends (Last 12 Months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const Fee = (await import("@/models/Fee")).default;
        const revenueTrendsPromise = Fee.aggregate([
            { 
                $match: { 
                    ...instituteQuery, 
                    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] 
                } 
            },
            { $unwind: "$installments" },
            { 
                $match: { 
                    "installments.status": "paid",
                    "installments.paidDate": { $gte: twelveMonthsAgo }
                } 
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$installments.paidDate" },
                        month: { $month: "$installments.paidDate" }
                    },
                    total: { $sum: "$installments.amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // 7. Activity Feed (Audit Log)
        const AuditLog = (await import("@/models/AuditLog")).default;
        const activityFeedPromise = AuditLog.find(isGlobalView ? {} : { institute: scope.instituteId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('actor', 'profile.firstName profile.lastName');

        // 8. Growth Calculations (30d over 60d)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        const getGrowth = async (model, query) => {
            const currentCount = await model.countDocuments({ ...query, createdAt: { $gte: thirtyDaysAgo } });
            const previousCount = await model.countDocuments({ ...query, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
            if (previousCount === 0) return currentCount > 0 ? 100 : 0;
            return Math.round(((currentCount - previousCount) / previousCount) * 100);
        };

        const [
            studentsCount, 
            staffCount, 
            totalEnrollmentsResult, 
            enquiriesCount, 
            topCourses, 
            recentAdmissions,
            revenueTrends,
            studentGrowth,
            enquiryGrowth
        ] = await Promise.all([
            studentsCountPromise,
            staffCountPromise,
            totalEnrollmentsPromise,
            enquiriesCountPromise,
            topCoursesPromise,
            recentAdmissionsPromise,
            revenueTrendsPromise,
            getGrowth(User, { ...hybridBaseQuery, role: 'student' }),
            getGrowth(Enquiry, instituteQuery)
        ]);

        // Map revenue trends to fill missing months
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const yearMonths = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (11 - i));
            yearMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: months[d.getMonth()] });
        }

        const formattedRevenue = yearMonths.map(ym => {
            const match = revenueTrends.find(r => r._id.year === ym.year && r._id.month === ym.month);
            return {
                label: ym.label,
                total: match ? match.total : 0
            };
        });

        const totalRevenue = formattedRevenue.reduce((sum, r) => sum + r.total, 0);

        return NextResponse.json({
            counts: {
                students: studentsCount,
                coursesEnrolled: totalEnrollmentsResult[0]?.total || 0,
                staff: staffCount,
                enquiries: enquiriesCount
            },
            trends: {
                student: studentGrowth,
                enquiry: enquiryGrowth,
                enrollment: 0 // Default to zero for now
            },
            topCourses,
            recentAdmissions,
            revenueTrends: formattedRevenue,
            totalRevenue
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
