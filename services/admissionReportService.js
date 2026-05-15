import AdmissionApplication from '@/models/AdmissionApplication';
import Institute from '@/models/Institute';
import Course from '@/models/Course';
import mongoose from 'mongoose';

/**
 * Admission Report Service - Optimized for Multi-Tenant Architecture
 * Features:
 * - Strong data isolation at query level
 * - Efficient MongoDB aggregation pipelines
 * - Result caching for frequently accessed reports
 * - Pagination support for large datasets
 */

class AdmissionReportService {
    constructor() {
        // Simple in-memory cache with TTL
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Clear cache for an institute when new admissions are added
     * @param {string} instituteId
     */
    invalidateCache(instituteId) {
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
            if (key.includes(`inst_${instituteId}`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get from cache if valid (not expired)
     * @private
     */
    _getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Set cache with TTL
     * @private
     */
    _setCache(key, data) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.CACHE_TTL
        });
    }

    /**
     * Get monthly admission report for a vocational institution
     * Returns: total applications, converted, pending, cancelled by month
     * 
     * @param {string} instituteId - ObjectId of the institute
     * @param {Date} startDate - Report start date
     * @param {Date} endDate - Report end date
     * @param {object} options - {page, limit, includeDetails}
     * @returns {object} Monthly admission statistics
     */
    async getMonthlyReport(instituteId, startDate, endDate, options = {}) {
        const { page = 1, limit = 100, includeDetails = false } = options;

        // Validate institute ID
        if (!mongoose.Types.ObjectId.isValid(instituteId)) {
            throw new Error('Invalid institute ID');
        }

        const instId = new mongoose.Types.ObjectId(instituteId);

        // Cache key includes parameters for uniqueness
        const cacheKey = `monthly_report_inst_${instituteId}_${startDate.getTime()}_${endDate.getTime()}_pg${page}`;
        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        const pipeline = [
            // Step 1: STRICT DATA ISOLATION - Filter by institute
            {
                $match: {
                    institute: instId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },

            // Step 2: GROUP BY MONTH with status breakdown
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalApplications: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    },
                    conversionRate: {
                        $avg: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    }
                }
            },

            // Step 3: SORT by date descending
            {
                $sort: { '_id.year': -1, '_id.month': -1 }
            }
        ];

        try {
            const monthlyData = await AdmissionApplication.aggregate(pipeline);

            const result = {
                instituteId: instituteId,
                reportPeriod: {
                    start: startDate,
                    end: endDate
                },
                monthlyData: monthlyData.map(item => ({
                    date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                    totalApplications: item.totalApplications,
                    converted: item.converted,
                    pending: item.pending,
                    cancelled: item.cancelled,
                    conversionRate: (item.conversionRate * 100).toFixed(2) + '%'
                })),
                summary: {
                    totalApplications: monthlyData.reduce((sum, m) => sum + m.totalApplications, 0),
                    totalConverted: monthlyData.reduce((sum, m) => sum + m.converted, 0),
                    totalPending: monthlyData.reduce((sum, m) => sum + m.pending, 0),
                    totalCancelled: monthlyData.reduce((sum, m) => sum + m.cancelled, 0)
                },
                pagination: { page, limit }
            };

            // Calculate overall conversion rate
            result.summary.overallConversionRate = result.summary.totalApplications > 0
                ? ((result.summary.totalConverted / result.summary.totalApplications) * 100).toFixed(2) + '%'
                : '0%';

            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to generate monthly report: ${error.message}`);
        }
    }

    /**
     * Get daily admission statistics (for charts)
     * Returns: daily application count with status breakdown
     * 
     * @param {string} instituteId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {array} Daily data points
     */
    async getDailyStats(instituteId, startDate, endDate) {
        const instId = new mongoose.Types.ObjectId(instituteId);
        const cacheKey = `daily_stats_inst_${instituteId}_${startDate.getTime()}_${endDate.getTime()}`;

        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        const pipeline = [
            {
                $match: {
                    institute: instId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    applications: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ];

        try {
            const dailyData = await AdmissionApplication.aggregate(pipeline);

            const result = dailyData.map(item => ({
                date: item._id,
                applications: item.applications,
                converted: item.converted,
                pending: item.pending,
                cancelled: item.cancelled
            }));

            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get daily stats: ${error.message}`);
        }
    }

    /**
     * Get admission breakdown by course
     * 
     * @param {string} instituteId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {array} Course-wise breakdown
     */
    async getCourseBreakdown(instituteId, startDate, endDate) {
        const instId = new mongoose.Types.ObjectId(instituteId);
        const cacheKey = `course_breakdown_inst_${instituteId}_${startDate.getTime()}_${endDate.getTime()}`;

        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        const pipeline = [
            {
                $match: {
                    institute: instId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course',
                    foreignField: '_id',
                    as: 'courseData',
                    pipeline: [
                        { $project: { name: 1, code: 1 } }
                    ]
                }
            },
            {
                $unwind: {
                    path: '$courseData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$course',
                    courseName: { $first: '$courseData.name' },
                    courseCode: { $first: '$courseData.code' },
                    totalApplications: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalApplications: -1 } }
        ];

        try {
            const courseData = await AdmissionApplication.aggregate(pipeline);

            const result = courseData.map(item => ({
                courseId: item._id.toString(),
                courseName: item.courseName || 'Unknown',
                courseCode: item.courseCode || 'N/A',
                totalApplications: item.totalApplications,
                converted: item.converted,
                pending: item.pending,
                cancelled: item.cancelled,
                conversionRate: (item.converted / item.totalApplications * 100).toFixed(2) + '%'
            }));

            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get course breakdown: ${error.message}`);
        }
    }

    /**
     * Get admission breakdown by referral source
     * 
     * @param {string} instituteId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {array} Referral source breakdown
     */
    async getReferralBreakdown(instituteId, startDate, endDate) {
        const instId = new mongoose.Types.ObjectId(instituteId);
        const cacheKey = `referral_breakdown_inst_${instituteId}_${startDate.getTime()}_${endDate.getTime()}`;

        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        const pipeline = [
            {
                $match: {
                    institute: instId,
                    createdAt: { $gte: startDate, $lte: endDate },
                    referredBy: { $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$referredBy',
                    totalApplications: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalApplications: -1 } },
            { $limit: 20 } // Top 20 referral sources
        ];

        try {
            const referralData = await AdmissionApplication.aggregate(pipeline);

            const result = referralData.map(item => ({
                source: item._id || 'Direct',
                applications: item.totalApplications,
                converted: item.converted,
                conversionRate: (item.converted / item.totalApplications * 100).toFixed(2) + '%'
            }));

            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get referral breakdown: ${error.message}`);
        }
    }

    /**
     * Get individual admission details with pagination
     * Strict data isolation - only returns data for specified institute
     * 
     * @param {string} instituteId
     * @param {Date} startDate
     * @param {Date} endDate
     * @param {object} options - {page, limit, status, courseId}
     * @returns {object} Paginated admission details
     */
    async getAdmissionDetails(instituteId, startDate, endDate, options = {}) {
        const { page = 1, limit = 50, status, courseId } = options;

        const instId = new mongoose.Types.ObjectId(instituteId);

        const query = {
            institute: instId,
            createdAt: { $gte: startDate, $lte: endDate }
        };

        if (status) query.status = status;
        if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
            query.course = new mongoose.Types.ObjectId(courseId);
        }

        try {
            const skip = (page - 1) * limit;

            const [admissions, total] = await Promise.all([
                AdmissionApplication.find(query)
                    .populate('course', 'name code')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                AdmissionApplication.countDocuments(query)
            ]);

            return {
                data: admissions.map(item => ({
                    _id: item._id.toString(),
                    firstName: item.firstName,
                    lastName: item.lastName,
                    email: item.email,
                    phone: item.phone,
                    status: item.status,
                    course: item.course?.name,
                    courseCode: item.course?.code,
                    learningMode: item.learningMode,
                    referredBy: item.referredBy,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasMore: page < Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Failed to get admission details: ${error.message}`);
        }
    }

    /**
     * Verify institute ownership to prevent cross-tenant data access
     * Should be called in API routes before generating reports
     * 
     * @param {string} instituteId
     * @param {string} userInstituteId
     * @returns {boolean}
     */
    async verifyInstituteAccess(instituteId, userInstituteId) {
        // User can only access their own institute data
        return instituteId === userInstituteId;
    }

    /**
     * Get monthly admission statistics with who/what details
     * Returns list of admitted students with their details grouped by month
     * 
     * @param {string} instituteId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {object} Month-wise admission details
     */
    async getMonthlyAdmissionsWithDetails(instituteId, startDate, endDate) {
        const instId = new mongoose.Types.ObjectId(instituteId);
        const cacheKey = `monthly_details_inst_${instituteId}_${startDate.getTime()}_${endDate.getTime()}`;

        const cached = this._getCached(cacheKey);
        if (cached) return cached;

        const pipeline = [
            {
                $match: {
                    institute: instId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course',
                    foreignField: '_id',
                    as: 'courseInfo'
                }
            },
            {
                $unwind: {
                    path: '$courseInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    admissions: {
                        $push: {
                            id: '$_id',
                            name: { $concat: ['$firstName', ' ', '$lastName'] },
                            email: '$email',
                            phone: '$phone',
                            course: '$courseInfo.name',
                            status: '$status',
                            learningMode: '$learningMode',
                            referredBy: '$referredBy',
                            admittedAt: '$createdAt'
                        }
                    },
                    totalApplications: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    }
                }
            },
            {
                $sort: { '_id.year': -1, '_id.month': -1 }
            }
        ];

        try {
            const monthlyDetails = await AdmissionApplication.aggregate(pipeline);

            const result = monthlyDetails.map(item => ({
                month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                summary: {
                    total: item.totalApplications,
                    converted: item.converted,
                    pending: item.pending
                },
                admissions: item.admissions
            }));

            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get monthly admission details: ${error.message}`);
        }
    }
}

// Export as singleton
export const admissionReportService = new AdmissionReportService();
