'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
    Calendar,
    Filter,
    Download,
    Search,
    BarChart3,
    FileSpreadsheet,
    Loader2,
    TrendingUp,
    Users,
    CheckCircle,
    Clock,
    XCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function AdmissionReportsPage() {
    const toast = useToast();
    const { data: session } = useSession();
    const router = useRouter();

    // State Management
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('monthly');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [hasCheckedVocational, setHasCheckedVocational] = useState(false);

    // Date Filters
    const [startDate, setStartDate] = useState(
        format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd')
    );
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // Report Data
    const [monthlyData, setMonthlyData] = useState(null);
    const [dailyData, setDailyData] = useState(null);
    const [courseData, setCourseData] = useState(null);
    const [referralData, setReferralData] = useState(null);
    const [detailsData, setDetailsData] = useState(null);
    const [monthlyDetailsData, setMonthlyDetailsData] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    const instituteId = session?.user?.institute?.id;
    const isVocational = session?.user?.institute?.type === 'VOCATIONAL';

    // Check vocational institute access once on load
    useEffect(() => {
        if (hasCheckedVocational) return;
        
        if (session && !isVocational) {
            router.push('/admin/dashboard');
            setHasCheckedVocational(true);
            return;
        }
        
        if (session && isVocational && instituteId) {
            fetchCourses();
            setHasCheckedVocational(true);
        }
    }, [session, isVocational, instituteId, hasCheckedVocational, router]);

    const fetchCourses = async () => {
        try {
            if (!instituteId) return;
            const res = await fetch(`/api/v1/courses?instituteId=${instituteId}`);
            if (!res.ok) {
                console.error('Failed to fetch courses:', res.statusText);
                return;
            }
            const data = await res.json();
            if (data.courses) setCourses(data.courses);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        }
    };

    // Main report fetching function
    const fetchReport = async () => {
        if (!instituteId) {
            toast.error('Institute information is not loaded');
            return;
        }

        if (!startDate || !endDate) {
            toast.error('Please select a date range');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error('Start date must be before end date');
            return;
        }

        setLoading(true);
        try {
            const baseQuery = new URLSearchParams({
                instituteId,
                startDate,
                endDate
            });

            // Fetch all report types in parallel
            const [monthlyRes, dailyRes, courseRes, referralRes, detailsRes, monthlyDetailsRes] = await Promise.all([
                fetch(`/api/v1/admissions/reports?${baseQuery}&type=monthly&page=${page}&limit=${limit}`),
                fetch(`/api/v1/admissions/reports?${baseQuery}&type=daily`),
                fetch(`/api/v1/admissions/reports?${baseQuery}&type=course-breakdown`),
                fetch(`/api/v1/admissions/reports?${baseQuery}&type=referral`),
                fetch(
                    `/api/v1/admissions/reports?${baseQuery}&type=details&page=${page}&limit=${limit}${selectedStatus ? `&status=${selectedStatus}` : ''}${selectedCourse ? `&courseId=${selectedCourse}` : ''}`
                ),
                fetch(`/api/v1/admissions/reports?${baseQuery}&type=monthly-with-details`)
            ]);

            if (!monthlyRes.ok) {
                const errorData = await monthlyRes.json();
                throw new Error(errorData.error || 'Failed to fetch monthly report');
            }

            const [monthly, daily, course, referral, details, monthlyDetails] = await Promise.all([
                monthlyRes.json(),
                dailyRes.ok ? dailyRes.json() : null,
                courseRes.ok ? courseRes.json() : null,
                referralRes.ok ? referralRes.json() : null,
                detailsRes.ok ? detailsRes.json() : null,
                monthlyDetailsRes.ok ? monthlyDetailsRes.json() : null
            ]);

            setMonthlyData(monthly);
            setDailyData(daily);
            setCourseData(course);
            setReferralData(referral);
            setDetailsData(details);
            setMonthlyDetailsData(monthlyDetails);

            toast.success('Report generated successfully');
        } catch (error) {
            console.error('Report Error:', error);
            toast.error(error.message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        if (!monthlyData) {
            toast.error('No data to export');
            return;
        }

        try {
            const ws = XLSX.utils.json_to_sheet(
                monthlyData.monthlyData.map(item => ({
                    Month: item.date,
                    'Total Applications': item.totalApplications,
                    Converted: item.converted,
                    Pending: item.pending,
                    Cancelled: item.cancelled,
                    'Conversion Rate': item.conversionRate
                }))
            );

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

            // Add course breakdown if available
            if (courseData) {
                const courseWs = XLSX.utils.json_to_sheet(
                    courseData.map(item => ({
                        Course: item.courseName,
                        Code: item.courseCode,
                        'Total Applications': item.totalApplications,
                        Converted: item.converted,
                        'Conversion Rate': item.conversionRate
                    }))
                );
                XLSX.utils.book_append_sheet(wb, courseWs, 'Course Breakdown');
            }

            // Add details if available
            if (detailsData?.data) {
                const detailsWs = XLSX.utils.json_to_sheet(
                    detailsData.data.map(item => ({
                        'First Name': item.firstName,
                        'Last Name': item.lastName,
                        Email: item.email,
                        Phone: item.phone,
                        Course: item.course,
                        'Learning Mode': item.learningMode,
                        Status: item.status,
                        'Referred By': item.referredBy,
                        'Applied On': format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')
                    }))
                );
                XLSX.utils.book_append_sheet(wb, detailsWs, 'Applications');
            }

            XLSX.writeFile(wb, `admission-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success('Report exported successfully');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Failed to export report');
        }
    };

    // Summary Cards Component
    const SummaryCards = () => {
        if (!monthlyData?.summary) return null;

        const { totalApplications, totalConverted, totalPending, totalCancelled, overallConversionRate } = monthlyData.summary;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Applications</p>
                                <p className="text-2xl font-bold mt-2">{totalApplications}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Converted</p>
                                <p className="text-2xl font-bold mt-2 text-green-600">{totalConverted}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold mt-2 text-yellow-600">{totalPending}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Cancelled</p>
                                <p className="text-2xl font-bold mt-2 text-red-600">{totalCancelled}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Conversion Rate</p>
                                <p className="text-2xl font-bold mt-2 text-blue-600">{overallConversionRate}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Render Charts
    const renderDailyTrendChart = () => {
        if (!dailyData || dailyData.length === 0) return null;

        return (
            <Card className="mb-6">
                <CardHeader title="Daily Admission Trend" />
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="applications" stroke="#3B82F6" strokeWidth={2} />
                            <Line type="monotone" dataKey="converted" stroke="#10B981" strokeWidth={2} />
                            <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    };

    const renderMonthlyChart = () => {
        if (!monthlyData?.monthlyData || monthlyData.monthlyData.length === 0) return null;

        const data = monthlyData.monthlyData.map(item => ({
            month: item.date,
            converted: item.converted,
            pending: item.pending,
            cancelled: item.cancelled
        }));

        return (
            <Card className="mb-6">
                <CardHeader title="Monthly Admission Status Breakdown" />
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="converted" fill="#10B981" />
                            <Bar dataKey="pending" fill="#F59E0B" />
                            <Bar dataKey="cancelled" fill="#EF4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    };

    const renderCourseChart = () => {
        if (!courseData || courseData.length === 0) return null;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader title="Admissions by Course" />
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={courseData}
                                    dataKey="totalApplications"
                                    nameKey="courseName"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label
                                >
                                    {courseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Course-wise Conversion Rate" />
                    <CardContent>
                        <div className="space-y-3">
                            {courseData.map(course => (
                                <div key={course.courseId} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{course.courseName}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{ width: `${parseFloat(course.conversionRate)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-bold w-12">{course.conversionRate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderReferralChart = () => {
        if (!referralData || referralData.length === 0) return null;

        return (
            <Card className="mb-6">
                <CardHeader title="Top Referral Sources" />
                <CardContent>
                    <div className="space-y-3">
                        {referralData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span className="font-medium">{item.source}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-600">{item.applications} apps</span>
                                    <span className="text-sm font-bold text-green-600">{item.conversionRate}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderDetailsTable = () => {
        if (!detailsData?.data || detailsData.data.length === 0) return null;

        return (
            <Card>
                <CardHeader title="Admission Details" />
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                                    <th className="px-4 py-2 text-left font-semibold">Email</th>
                                    <th className="px-4 py-2 text-left font-semibold">Phone</th>
                                    <th className="px-4 py-2 text-left font-semibold">Course</th>
                                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                                    <th className="px-4 py-2 text-left font-semibold">Applied On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailsData.data.map(item => (
                                    <tr key={item._id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{`${item.firstName} ${item.lastName}`}</td>
                                        <td className="px-4 py-2 text-blue-600">{item.email}</td>
                                        <td className="px-4 py-2">{item.phone}</td>
                                        <td className="px-4 py-2">{item.courseCode}</td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    item.status === 'converted'
                                                        ? 'bg-green-100 text-green-800'
                                                        : item.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{format(new Date(item.createdAt), 'yyyy-MM-dd')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {detailsData.pagination && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-gray-600">
                                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, detailsData.pagination.total)} of{' '}
                                {detailsData.pagination.total} records
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={!detailsData.pagination.hasMore}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (!isVocational) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-red-600 font-semibold">
                            Admission reports are only available for vocational institutions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Don't render if not vocational (should be redirected, but add safety check)
    if (!hasCheckedVocational) {
        return null;
    }

    if (!isVocational) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Admission Reports</h1>
                <p className="text-gray-600 mt-2">Monthly wise admission data for your vocational institution</p>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader title="Filters" />
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Course</label>
                            <Select
                                value={selectedCourse}
                                onChange={e => setSelectedCourse(e.target.value)}
                                placeholder="All Courses"
                            >
                                <option value="">All Courses</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>
                                        {course.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <Select
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                placeholder="All Status"
                            >
                                <option value="">All Status</option>
                                <option value="converted">Converted</option>
                                <option value="pending">Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button
                                onClick={fetchReport}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Filter className="w-4 h-4 mr-2" />
                                        Generate Report
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {monthlyData && (
                        <Button
                            onClick={exportToExcel}
                            variant="outline"
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export to Excel
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Report Content */}
            {monthlyData && (
                <>
                    <SummaryCards />
                    {renderDailyTrendChart()}
                    {renderMonthlyChart()}
                    {renderCourseChart()}
                    {renderReferralChart()}
                    {renderDetailsTable()}
                </>
            )}
        </div>
    );
}
