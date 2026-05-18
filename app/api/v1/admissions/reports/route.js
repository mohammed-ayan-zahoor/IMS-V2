import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { admissionReportService } from '@/services/admissionReportService';
import Institute from '@/models/Institute';

/**
 * Admission Reports API - Multi-Tenant Optimized
 * 
 * Endpoints:
 * GET /api/v1/admissions/reports/monthly?instituteId=...&startDate=...&endDate=...
 * GET /api/v1/admissions/reports/daily?instituteId=...&startDate=...&endDate=...
 * GET /api/v1/admissions/reports/course-breakdown?instituteId=...&startDate=...&endDate=...
 * GET /api/v1/admissions/reports/referral?instituteId=...&startDate=...&endDate=...
 * GET /api/v1/admissions/reports/details?instituteId=...&startDate=...&endDate=...
 * GET /api/v1/admissions/reports/monthly-with-details?instituteId=...&startDate=...&endDate=...
 */

/**
 * Middleware: Verify institute access before processing
 * This ensures users can only access reports for their own institute
 */
async function verifyInstituteAccess(session, instituteId) {
    // Super admin can access all institutes
    if (session.user.role === 'super_admin') {
        return true;
    }

    // Regular admins/users can only access their own institute
    if (session.user.instituteId && session.user.instituteId !== instituteId) {
        throw new Error('Unauthorized: Cannot access other institute data');
    }

    // Verify institute exists and is active
    const institute = await Institute.findById(instituteId);
    if (!institute || institute.type !== 'VOCATIONAL') {
        throw new Error('Invalid or non-vocational institute');
    }

    return true;
}

/**
 * Parse and validate date parameters
 */
function parseDateParams(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    if (start > end) {
        throw new Error('Start date must be before end date');
    }

    // Prevent queries longer than 1 year for performance
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 365 days');
    }

    return { start, end };
}

export async function GET(req) {
    try {
        // 1. AUTHENTICATION CHECK
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // 2. PARSE QUERY PARAMETERS
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const reportType = searchParams.get('type') || 'monthly';
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 500); // Max 500
        const status = searchParams.get('status');
        const courseId = searchParams.get('courseId');

        // 3. VALIDATE REQUIRED PARAMETERS
        if (!instituteId || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required parameters: instituteId, startDate, endDate' },
                { status: 400 }
            );
        }

        // 4. MULTI-TENANT SECURITY CHECK
        try {
            await verifyInstituteAccess(session, instituteId);
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // 5. VALIDATE DATE RANGE
        let dateRange;
        try {
            dateRange = parseDateParams(startDate, endDate);
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // 6. ROUTE TO APPROPRIATE REPORT HANDLER
        let reportData;

        switch (reportType) {
            case 'monthly':
                try {
                    reportData = await admissionReportService.getMonthlyReport(
                        instituteId,
                        dateRange.start,
                        dateRange.end,
                        { page, limit }
                    );
                } catch (error) {
                    console.error('[Monthly Report Error]', {
                        instituteId,
                        startDate,
                        endDate,
                        error: error.message
                    });
                    throw error;
                }
                break;

            case 'daily':
                reportData = await admissionReportService.getDailyStats(
                    instituteId,
                    dateRange.start,
                    dateRange.end
                );
                break;

            case 'course-breakdown':
                reportData = await admissionReportService.getCourseBreakdown(
                    instituteId,
                    dateRange.start,
                    dateRange.end
                );
                break;

            case 'referral':
                reportData = await admissionReportService.getReferralBreakdown(
                    instituteId,
                    dateRange.start,
                    dateRange.end
                );
                break;

            case 'details':
                try {
                    console.log('[API] Fetching details with params:', { instituteId, page, limit, status, courseId, startDate: dateRange.start, endDate: dateRange.end });
                    reportData = await admissionReportService.getAdmissionDetails(
                        instituteId,
                        dateRange.start,
                        dateRange.end,
                        { page, limit, status, courseId }
                    );
                    console.log('[API] Details retrieved, records:', reportData?.data?.length);
                } catch (detailsError) {
                    console.error('[API] Details error:', detailsError.message, detailsError.stack);
                    throw detailsError;
                }
                break;

            case 'monthly-with-details':
                reportData = await admissionReportService.getMonthlyAdmissionsWithDetails(
                    instituteId,
                    dateRange.start,
                    dateRange.end
                );
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown report type: ${reportType}` },
                    { status: 400 }
                );
        }

        // 7. RETURN RESULTS WITH CACHE HEADERS
        const response = NextResponse.json(reportData);

        // Cache for 5 minutes if data hasn't been modified
        response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

        return response;

    } catch (error) {
        console.error('[Admission Report Error]:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate report' },
            { status: 500 }
        );
    }
}
