import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Enquiry from "@/models/Enquiry";
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";

// Simple cache: reuse data for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const statsCache = new Map();

// Helper function to clear cache for an institute
export function clearDashboardCache(instituteId = null) {
    if (instituteId) {
        // Clear cache for specific institute (both scoped and global)
        statsCache.delete(`stats_${instituteId}_scoped`);
        statsCache.delete(`stats_${instituteId}_global`);
    } else {
        // Clear all cache
        statsCache.clear();
    }
}


export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get("instituteId");
        const sessionParam = searchParams.get("session");

        const isGlobalView = scope.isSuperAdmin && (targetInstParam === "all" || !targetInstParam);
        
        // Check Cache
        const cacheKey = `stats_${scope.instituteId}_${isGlobalView ? 'global' : 'scoped'}`;
        const cachedEntry = statsCache.get(cacheKey);
        const nowTime = Date.now();
        if (cachedEntry && (nowTime - cachedEntry.timestamp) < CACHE_DURATION) {
            return NextResponse.json(cachedEntry.data);
        }


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
        const activeStudentsCountPromise = User.countDocuments({ ...hybridBaseQuery, role: 'student', status: 'ACTIVE' });
        const completedStudentsCountPromise = User.countDocuments({ ...hybridBaseQuery, role: 'student', status: 'COMPLETED' });
        const droppedStudentsCountPromise = User.countDocuments({ ...hybridBaseQuery, role: 'student', status: 'DROPPED' });
        const staffCountPromise = User.countDocuments({ ...hybridBaseQuery, role: { $in: ['admin', 'staff'] } });

        // 2. Total Enrollments (Sum of student counts across all active batches)
        const totalEnrollmentsPromise = Batch.aggregate([
            { $match: { ...instituteQuery, ...(sessionParam ? { session: new mongoose.Types.ObjectId(sessionParam) } : {}) } },
            { $project: { enrollmentCount: { $size: { $ifNull: ["$enrolledStudents", []] } } } },
            { $group: { _id: null, total: { $sum: "$enrollmentCount" } } }
        ]);

        // 3. Enquiry Count
        const enquiriesCountPromise = Enquiry.countDocuments(instituteQuery);

        // 4. Top Courses (Leaderboard)
        let topCoursesPromise = Batch.aggregate([
            { $match: { ...instituteQuery, ...(sessionParam ? { session: new mongoose.Types.ObjectId(sessionParam) } : {}) } },
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
        
        // If session filter is applied and returns no results, fallback to all sessions
        topCoursesPromise = topCoursesPromise.then(async (result) => {
            if (result.length === 0 && sessionParam) {
                // Retry without session filter
                return await Batch.aggregate([
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
            }
            return result;
        });

        // 5. Recent Admissions
        const recentAdmissionsPromise = User.find({ ...hybridBaseQuery, role: 'student' })
            .select('profile.firstName profile.lastName email role createdAt enrollmentNumber status')
            .sort({ createdAt: -1 })
            .limit(5);

        // 6. Revenue Trends (Last 12 Months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const Fee = (await import("@/models/Fee")).default;
        const Student = (await import("@/models/User")).default;
        
        // Build revenue query with session filter
        let revenueQuery = {
            ...instituteQuery,
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
        };
        
        // If session filter is applied, we need to fetch fees for students in that session
        if (sessionParam) {
            const sessionObjectId = new mongoose.Types.ObjectId(sessionParam);
            // Find students enrolled in batches of this session
            const studentsInSession = await Batch.find({
                ...instituteQuery,
                session: sessionObjectId
            }).distinct('enrolledStudents');
            
            revenueQuery.student = { $in: studentsInSession };
        }

        const revenueTrendsPromise = Fee.aggregate([
            { 
                $match: revenueQuery
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
            totalStudentsCount, 
            activeStudentsCount,
            completedStudentsCount,
            droppedStudentsCount,
            staffCount, 
            totalEnrollmentsResult, 
            enquiriesCount, 
            topCourses, 
            recentAdmissions,
            revenueTrends,
            studentGrowth,
            enquiryGrowth,
            enrollmentGrowth
        ] = await Promise.all([
            studentsCountPromise,
            activeStudentsCountPromise,
            completedStudentsCountPromise,
            droppedStudentsCountPromise,
            staffCountPromise,
            totalEnrollmentsPromise,
            enquiriesCountPromise,
            topCoursesPromise,
            recentAdmissionsPromise,
            revenueTrendsPromise,
            getGrowth(User, { ...hybridBaseQuery, role: 'student' }),
            getGrowth(Enquiry, instituteQuery),
            getGrowth(Batch, { 
                ...instituteQuery, 
                ...(sessionParam ? { session: new mongoose.Types.ObjectId(sessionParam) } : {}),
                enrolledStudents: { $exists: true, $not: { $size: 0 } } 
            })
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

        const responseData = {
            counts: {
                students: totalStudentsCount, // Backward compatibility
                totalStudents: totalStudentsCount,
                activeStudents: activeStudentsCount,
                completedStudents: completedStudentsCount,
                droppedStudents: droppedStudentsCount,
                coursesEnrolled: totalEnrollmentsResult[0]?.total || 0,
                staff: staffCount,
                enquiries: enquiriesCount,
                completionRate: totalStudentsCount > 0 ? parseFloat(((completedStudentsCount / totalStudentsCount) * 100).toFixed(2)) : 0,
                droppedRate: totalStudentsCount > 0 ? parseFloat(((droppedStudentsCount / totalStudentsCount) * 100).toFixed(2)) : 0,
                activeRate: totalStudentsCount > 0 ? parseFloat(((activeStudentsCount / totalStudentsCount) * 100).toFixed(2)) : 0
            },
            trends: {
                student: studentGrowth,
                enquiry: enquiryGrowth,
                enrollment: enrollmentGrowth
            },
            topCourses,
            recentAdmissions,
            revenueTrends: formattedRevenue,
            totalRevenue
        };

        // Cache the response
        statsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        return NextResponse.json(responseData);

    } catch (error) {
        console.error("Dashboard Stats Error:", error);

        if (error.name === 'CastError') {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        return NextResponse.json({ 
            error: "Internal server error", 
            message: process.env.NODE_ENV === 'development' ? error.message : undefined 
        }, { status: 500 });
    }
}
