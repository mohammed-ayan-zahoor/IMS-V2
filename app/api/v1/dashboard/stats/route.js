import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Enquiry from "@/models/Enquiry";
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";
import { validateAndDeriveSession, logSessionAccess } from "@/middleware/sessionValidation";

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

        const isGlobalView = scope.isSuperAdmin && (targetInstParam === "all" || !targetInstParam);
        const targetInstituteId = isGlobalView ? null : (targetInstParam || scope.instituteId);
        
        let instituteType = null;
        let sessionId = null;
        let sessionValidationResult = null;

        if (targetInstituteId) {
            const Institute = (await import("@/models/Institute")).default;
            const inst = await Institute.findById(targetInstituteId).select('type');
            if (!inst) {
                return NextResponse.json({ error: "Institute not found" }, { status: 404 });
            }
            instituteType = inst.type;

            // SECURITY FIX: Server-side session derivation & validation
            // Do NOT trust client-provided x-session-id header
            try {
                sessionValidationResult = await validateAndDeriveSession(req, {
                    ...scope,
                    instituteId: targetInstituteId
                });

                sessionId = sessionValidationResult.sessionId;

            } catch (validationError) {
                console.error('[SECURITY] Session validation failed for dashboard:', validationError.message);
                // For SCHOOL institutes, fail closed
                if (instituteType === 'SCHOOL') {
                    return NextResponse.json(
                        { error: `Session validation failed: ${validationError.message}` },
                        { status: 403 }
                    );
                }
                // For VOCATIONAL, continue without session
                sessionId = null;
            }
        }

        // Check Cache
        const cacheKey = `stats_${targetInstituteId}_${isGlobalView ? 'global' : 'scoped'}_${sessionId || 'all'}`;
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

        // 1. User Counts (Students, Staff)
        const studentBaseQuery = { ...hybridBaseQuery, role: 'student' };

        const sessionParam = searchParams.get('session');
        const source = sessionValidationResult?.source || 'UNKNOWN';

        // SECURITY FIX: Apply strict session isolation for Schools
        if (instituteType === 'SCHOOL') {
            if (!sessionId) {
                // If we reach here, it means validateAndDeriveSession returned source: 'NO_SESSION_AVAILABLE'
                // For the dashboard, we allow this to show aggregate data, but we log it as a warning
                console.warn(`[DASHBOARD] Showing aggregate data for SCHOOL institute ${targetInstituteId} because no active session was found.`);
            } else {
                try {
                    // Use $and to ensure we don't accidentally overwrite or conflict with other filters
                    const sessionFilter = {
                        activeSession: new mongoose.Types.ObjectId(sessionId)
                    };
                    
                    if (studentBaseQuery.$and) {
                        studentBaseQuery.$and.push(sessionFilter);
                    } else {
                        studentBaseQuery.activeSession = sessionFilter.activeSession;
                    }
                } catch (e) {
                    console.error('[SECURITY] Invalid session ID format in dashboard:', e.message);
                    return NextResponse.json(
                        { error: "Invalid session ID format" },
                        { status: 400 }
                    );
                }
            }
        } else if (sessionId && instituteType !== 'VOCATIONAL') {
            // Warn if session being applied to unexpected institute type
            console.warn(`[SECURITY] Session filter applied to ${instituteType} institute in dashboard`);
        }

        const studentsCountPromise = User.countDocuments(studentBaseQuery);
        const activeStudentsCountPromise = User.countDocuments({ ...studentBaseQuery, status: 'ACTIVE' });
        const completedStudentsCountPromise = User.countDocuments({ ...studentBaseQuery, status: 'COMPLETED' });
        const droppedStudentsCountPromise = User.countDocuments({ ...studentBaseQuery, status: 'DROPPED' });
        const staffCountPromise = User.countDocuments({ ...hybridBaseQuery, role: { $in: ['admin', 'staff'] } });

        // 2. Total Enrollments (Sum of student counts across all active batches)
        const totalEnrollmentsPromise = Batch.aggregate([
            { $match: { ...instituteQuery, ...(sessionId && instituteType === 'SCHOOL' ? { session: new mongoose.Types.ObjectId(sessionId) } : {}) } },
            { $project: { enrollmentCount: { $size: { $ifNull: ["$enrolledStudents", []] } } } },
            { $group: { _id: null, total: { $sum: "$enrollmentCount" } } }
        ]);

        // 3. Enquiry Count
        const enquiriesCountPromise = Enquiry.countDocuments(instituteQuery);

        // 4. Top Courses (Leaderboard)
        const topCoursesPromise = Batch.aggregate([
            { $match: { ...instituteQuery, ...(sessionId && instituteType === 'SCHOOL' ? { session: new mongoose.Types.ObjectId(sessionId) } : {}) } },
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
        const recentAdmissionsPromise = User.find(studentBaseQuery)
            .select('profile.firstName profile.lastName email role createdAt enrollmentNumber status')
            .sort({ createdAt: -1 })
            .limit(5);

        // 6. Revenue Trends (Last 12 Months or All Time)
        // For display: always show last 12 months window
        // For query: show all revenue data (not filtered to last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const Fee = (await import("@/models/Fee")).default;
        
        // Build revenue query
        let revenueQuery = {
            ...instituteQuery,
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
        };
        
        // If session filter is applied, filter fees by batch of that session
        // Standardize: use sessionId derived from either param or server logic
        if (sessionId && instituteType === 'SCHOOL') {
            const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
            // Find batches of this session
            const batchesInSession = await Batch.find({
                ...instituteQuery,
                session: sessionObjectId
            }).select('_id');
            
            const batchIds = batchesInSession.map(b => b._id);
            if (batchIds.length > 0) {
                revenueQuery.batch = { $in: batchIds };
            } else {
                // If no batches in session, revenue is 0 for this session
                // We must force a condition that returns nothing
                revenueQuery.batch = new mongoose.Types.ObjectId(); 
            }
        }

        const revenueTrendsPromise = Fee.aggregate([
            { 
                $match: revenueQuery
            },
            { $unwind: "$installments" },
            { 
                $match: { 
                    "installments.status": "paid"
                    // Don't filter by date - show all revenue data
                } 
            },
            {
                $group: {
                    _id: {
                        year: { $year: { $ifNull: ["$installments.paidDate", "$createdAt"] } },
                        month: { $month: { $ifNull: ["$installments.paidDate", "$createdAt"] } }
                    },
                    total: { $sum: "$installments.amount" },
                    count: { $sum: 1 }  // Count how many paid installments per month
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
            getGrowth(User, studentBaseQuery),
            getGrowth(Enquiry, instituteQuery),
            getGrowth(Batch, { 
                ...instituteQuery, 
                ...(sessionParam ? { session: new mongoose.Types.ObjectId(sessionParam) } : {}),
                enrolledStudents: { $exists: true, $not: { $size: 0 } } 
            }            )
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
