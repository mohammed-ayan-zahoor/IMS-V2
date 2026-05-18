import AdmissionApplication from '@/models/AdmissionApplication';
import User from '@/models/User';
import Institute from '@/models/Institute';
import Course from '@/models/Course';
import Batch from '@/models/Batch';
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
     * Includes both enquiry-based applications and manual student admissions
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

        try {
            // Get enquiry-based admissions
            const enquiryPipeline = [
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
                        },
                        source: { $first: { $literal: 'enquiry' } }
                    }
                }
            ];

            // Get manual admissions (students with admissionDate in User model)
            const manualAdmissionsPipeline = [
                {
                    $match: {
                        institute: instId,
                        admissionDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'DROPPED' } // Exclude dropped students
                    }
                },

                // GROUP BY MONTH
                {
                    $group: {
                        _id: {
                            year: { $year: '$admissionDate' },
                            month: { $month: '$admissionDate' }
                        },
                        manualAdmissions: { $sum: 1 },
                        source: { $first: { $literal: 'manual' } }
                    }
                }
            ];

            const [enquiryData, manualData] = await Promise.all([
                AdmissionApplication.aggregate(enquiryPipeline).exec(),
                User.aggregate(manualAdmissionsPipeline).exec()
            ]);

            // Merge data by month
            const monthlyMap = new Map();

            // Add enquiry data
            enquiryData.forEach(item => {
                const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
                monthlyMap.set(key, {
                    date: key,
                    enquiryApplications: item.totalApplications,
                    enquiryConverted: item.converted,
                    enquiryPending: item.pending,
                    enquiryCancelled: item.cancelled,
                    enquiryConversionRate: (item.conversionRate * 100).toFixed(2) + '%',
                    manualAdmissions: 0,
                    _id: item._id
                });
            });

            // Add manual admission data
            manualData.forEach(item => {
                const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
                if (monthlyMap.has(key)) {
                    const existing = monthlyMap.get(key);
                    existing.manualAdmissions = item.manualAdmissions;
                    existing.totalAdmissions = (existing.enquiryConverted || 0) + item.manualAdmissions;
                } else {
                    monthlyMap.set(key, {
                        date: key,
                        enquiryApplications: 0,
                        enquiryConverted: 0,
                        enquiryPending: 0,
                        enquiryCancelled: 0,
                        enquiryConversionRate: '0%',
                        manualAdmissions: item.manualAdmissions,
                        totalAdmissions: item.manualAdmissions,
                        _id: item._id
                    });
                }
            });

            // Convert map to sorted array
            const monthlyArray = Array.from(monthlyMap.values())
                .sort((a, b) => {
                    const [aY, aM] = a.date.split('-').map(Number);
                    const [bY, bM] = b.date.split('-').map(Number);
                    return bY === aY ? bM - aM : bY - aY;
                });

            // Calculate summaries
            const totalEnquiryApplications = enquiryData.reduce((sum, m) => sum + m.totalApplications, 0);
            const totalEnquiryConverted = enquiryData.reduce((sum, m) => sum + m.converted, 0);
            const totalEnquiryPending = enquiryData.reduce((sum, m) => sum + m.pending, 0);
            const totalEnquiryCancelled = enquiryData.reduce((sum, m) => sum + m.cancelled, 0);
            const totalManualAdmissions = manualData.reduce((sum, m) => sum + m.manualAdmissions, 0);
            const totalTotalAdmissions = totalEnquiryConverted + totalManualAdmissions;

            // Get admission student IDs (both converted enquiries and manual admissions)
            const convertedApplications = await AdmissionApplication.find({
                institute: instId,
                status: 'converted',
                createdAt: { $gte: startDate, $lte: endDate }
            }, { course: 1 }).lean();

            const manualAdmittedUsers = await User.find({
                institute: instId,
                admissionDate: { $gte: startDate, $lte: endDate },
                status: { $ne: 'DROPPED' }
            }, { _id: 1 }).lean();

            const admittedStudentIds = [
                ...convertedApplications.map(app => app._id),
                ...manualAdmittedUsers.map(user => user._id)
            ];

            // Get current enrollments (active batches)
            let currentEnrollmentMetrics = { totalCurrentEnrollments: 0, totalStudentsEnrolled: 0 };
            let allTimeEnrollmentMetrics = { totalEnrollments: 0, totalStudentsEnrolled: 0 };

            if (admittedStudentIds.length > 0) {
                const currentEnrollments = await Batch.aggregate([
                    {
                        $match: {
                            institute: instId,
                            'enrolledStudents.student': { $in: admittedStudentIds },
                            'schedule.startDate': { $gte: new Date() } // Future/current batches
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalEnrollments: {
                                $sum: {
                                    $size: {
                                        $filter: {
                                            input: '$enrolledStudents',
                                            as: 'enrollment',
                                            cond: {
                                                $and: [
                                                    { $in: ['$$enrollment.student', admittedStudentIds] },
                                                    { $eq: ['$$enrollment.status', 'active'] }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                            uniqueStudents: { $addToSet: '$enrolledStudents.student' }
                        }
                    }
                ]).exec();

                if (currentEnrollments.length > 0) {
                    currentEnrollmentMetrics = {
                        totalCurrentEnrollments: currentEnrollments[0].totalEnrollments,
                        totalStudentsEnrolled: currentEnrollments[0].uniqueStudents.flat().length
                    };
                }

                // Get all-time enrollments (all batches)
                const allTimeEnrollments = await Batch.aggregate([
                    {
                        $match: {
                            institute: instId,
                            'enrolledStudents.student': { $in: admittedStudentIds }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalEnrollments: {
                                $sum: {
                                    $size: {
                                        $filter: {
                                            input: '$enrolledStudents',
                                            as: 'enrollment',
                                            cond: { $in: ['$$enrollment.student', admittedStudentIds] }
                                        }
                                    }
                                }
                            },
                            uniqueStudents: { $addToSet: '$enrolledStudents.student' }
                        }
                    }
                ]).exec();

                if (allTimeEnrollments.length > 0) {
                    allTimeEnrollmentMetrics = {
                        totalEnrollments: allTimeEnrollments[0].totalEnrollments,
                        totalStudentsEnrolled: allTimeEnrollments[0].uniqueStudents.flat().length
                    };
                }
            }

            const result = {
                instituteId: instituteId,
                reportPeriod: {
                    start: startDate,
                    end: endDate
                },
                monthlyData: monthlyArray.map(item => ({
                    date: item.date,
                    // Enquiry data
                    enquiryApplications: item.enquiryApplications,
                    enquiryConverted: item.enquiryConverted,
                    enquiryPending: item.enquiryPending,
                    enquiryCancelled: item.enquiryCancelled,
                    enquiryConversionRate: item.enquiryConversionRate,
                    // Manual admissions
                    manualAdmissions: item.manualAdmissions,
                    // Combined totals
                    totalApplications: (item.enquiryApplications || 0) + (item.manualAdmissions || 0),
                    totalAdmitted: (item.enquiryConverted || 0) + (item.manualAdmissions || 0)
                })),
                summary: {
                    // Enquiry applications
                    enquiryApplications: totalEnquiryApplications,
                    enquiryConverted: totalEnquiryConverted,
                    enquiryPending: totalEnquiryPending,
                    enquiryCancelled: totalEnquiryCancelled,
                    enquiryConversionRate: totalEnquiryApplications > 0
                        ? ((totalEnquiryConverted / totalEnquiryApplications) * 100).toFixed(2) + '%'
                        : '0%',
                    // Manual admissions
                    manualAdmissions: totalManualAdmissions,
                    // Totals
                    totalApplications: totalEnquiryApplications + totalManualAdmissions,
                    totalAdmitted: totalTotalAdmissions,
                    overallAdmissionRate: (totalEnquiryApplications + totalManualAdmissions) > 0
                        ? ((totalTotalAdmissions / (totalEnquiryApplications + totalManualAdmissions)) * 100).toFixed(2) + '%'
                        : '0%',
                    // Enrollment metrics
                    enrollments: {
                        current: {
                            totalCourseEnrollments: currentEnrollmentMetrics.totalCurrentEnrollments,
                            totalStudentsEnrolled: currentEnrollmentMetrics.totalStudentsEnrolled,
                            averageCoursesPerStudent: currentEnrollmentMetrics.totalStudentsEnrolled > 0
                                ? (currentEnrollmentMetrics.totalCurrentEnrollments / currentEnrollmentMetrics.totalStudentsEnrolled).toFixed(2)
                                : '0'
                        },
                        allTime: {
                            totalCourseEnrollments: allTimeEnrollmentMetrics.totalEnrollments,
                            totalStudentsEnrolled: allTimeEnrollmentMetrics.totalStudentsEnrolled,
                            averageCoursesPerStudent: allTimeEnrollmentMetrics.totalStudentsEnrolled > 0
                                ? (allTimeEnrollmentMetrics.totalEnrollments / allTimeEnrollmentMetrics.totalStudentsEnrolled).toFixed(2)
                                : '0'
                        }
                    }
                },
                pagination: { page, limit }
            };

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
            const dailyData = await AdmissionApplication.aggregate(pipeline).exec();

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
            const courseData = await AdmissionApplication.aggregate(pipeline).exec();

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
            const referralData = await AdmissionApplication.aggregate(pipeline).exec();

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

            // Get enrollment details (count + course names) for each admitted student
            const admissionIds = admissions.map(item => item._id);
            let enrollmentDetails = {};

            if (admissionIds.length > 0) {
                const enrollments = await Batch.aggregate([
                    {
                        $match: {
                            institute: instId,
                            'enrolledStudents.student': { $in: admissionIds }
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
                        $unwind: '$enrolledStudents'
                    },
                    {
                        $match: {
                            'enrolledStudents.student': { $in: admissionIds }
                        }
                    },
                    {
                        $group: {
                            _id: '$enrolledStudents.student',
                            enrollments: {
                                $push: {
                                    courseName: '$courseInfo.name',
                                    courseCode: '$courseInfo.code',
                                    status: '$enrolledStudents.status',
                                    batchName: '$name'
                                }
                            }
                        }
                    }
                ]).exec();

                enrollments.forEach(e => {
                    const currentEnrollments = e.enrollments.filter(en => en.status === 'active');
                    enrollmentDetails[e._id.toString()] = {
                        current: currentEnrollments.length,
                        total: e.enrollments.length,
                        currentCourses: currentEnrollments.map(en => en.courseName).join(', '),
                        totalCourses: e.enrollments.map(en => en.courseName).join(', ')
                    };
                });
            }

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
                    updatedAt: item.updatedAt,
                    enrollments: enrollmentDetails[item._id.toString()] || { 
                        current: 0, 
                        total: 0, 
                        currentCourses: '',
                        totalCourses: ''
                    }
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
            const monthlyDetails = await AdmissionApplication.aggregate(pipeline).exec();

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
