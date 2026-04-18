"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
    Users,
    BookOpen,
    Layers3,
    CreditCard,
    ArrowUpRight,
    TrendingUp,
    Trophy,
    AlertCircle,
    Clock,
    MessageSquare,
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import StudentSearch from "@/components/admin/StudentSearch";

const StatCard = ({ title, value, icon: Icon, trend, trendType = "up" }) => (
    <Card padding="p-6" className="premium-card-hover group">
        <div className="flex justify-between items-start mb-4">
            <span className="section-label">{title}</span>
            <div className="text-slate-300 group-hover:text-premium-blue transition-colors">
                <Icon size={20} />
            </div>
        </div>
        <div className="flex flex-col gap-1">
            <h2 className="metric-value text-slate-900">{value}</h2>
            <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm",
                    trendType === "up" ? "status-success" : trendType === "down" ? "status-error" : "bg-slate-100 text-slate-500"
                )}>
                    {trendType === "up" ? <TrendingUp size={10} /> : trendType === "down" ? <TrendingUp size={10} className="rotate-180" /> : <Clock size={10} />}
                    {trend}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                    {trend.includes('%') ? 'vs last month' : 'summary'}
                </span>
            </div>
        </div>
    </Card>
);

const getStatusBadge = (status) => {
    const statusConfig = {
        'ACTIVE': { variant: 'success', label: 'Active' },
        'COMPLETED': { variant: 'info', label: 'Completed' },
        'DROPPED': { variant: 'error', label: 'Dropped' },
        'PAUSED': { variant: 'warning', label: 'Paused' }
    };
    const config = statusConfig[status] || statusConfig['ACTIVE'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
};


export default function AdminDashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/dashboard/stats');
            if (res.ok) setDashboardData(await res.json());
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        
        // Refetch stats when page becomes visible (e.g., when returning from completion-tracking page)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const stats = [
        { 
            title: "ACTIVE STUDENTS", 
            value: loading ? "0" : (dashboardData?.counts?.activeStudents || 0).toLocaleString(), 
            icon: Users, 
            trend: `${dashboardData?.trends?.student >= 0 ? '+' : ''}${dashboardData?.trends?.student || 0}%`, 
            trendType: (dashboardData?.trends?.student || 0) >= 0 ? "up" : "down" 
        },
        { 
            title: "COMPLETED", 
            value: loading ? "0" : (dashboardData?.counts?.completedStudents || 0).toLocaleString(), 
            icon: Trophy, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.completedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral" 
        },
        { 
            title: "DROPPED", 
            value: loading ? "0" : (dashboardData?.counts?.droppedStudents || 0).toLocaleString(), 
            icon: AlertCircle, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.droppedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral" 
        },
        { 
            title: "ENROLLMENTS", 
            value: loading ? "0" : (dashboardData?.counts?.coursesEnrolled || 0).toLocaleString(), 
            icon: BookOpen, 
            trend: `${dashboardData?.trends?.enrollment >= 0 ? '+' : ''}${dashboardData?.trends?.enrollment || 0}%`, 
            trendType: (dashboardData?.trends?.enrollment || 0) >= 0 ? "up" : "down" 
        },
        { 
            title: "ENQUIRIES", 
            value: loading ? "0" : (dashboardData?.counts?.enquiries || 0).toLocaleString(), 
            icon: MessageSquare, 
            trend: `${dashboardData?.trends?.enquiry >= 0 ? '+' : ''}${dashboardData?.trends?.enquiry || 0}%`, 
            trendType: (dashboardData?.trends?.enquiry || 0) >= 0 ? "up" : "down" 
        },
        { 
            title: "STAFF", 
            value: loading ? "0" : (dashboardData?.counts?.staff || 0).toLocaleString(), 
            icon: Layers3, 
            trend: "+0%", 
            trendType: "up" 
        }
    ];



    return (
        <div className="space-y-10">
            {/* Metric Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Admissions List */}
                <Card className="premium-card">
                    <CardHeader 
                        title="Recent Admissions" 
                        subtitle="Chronological list of newly enrolled students"
                    />
                    <div className="space-y-1">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
                            ))
                        ) : dashboardData?.recentAdmissions?.length > 0 ? (
                            dashboardData.recentAdmissions.map((student) => (
                                <div 
                                    key={student._id} 
                                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50/80 group transition-all cursor-default"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                        {student.profile?.firstName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-bold text-slate-900 truncate">
                                            {student.profile?.firstName} {student.profile?.lastName}
                                        </p>
                                        <p className="text-[12px] text-slate-400 font-medium">#{student.enrollmentNumber}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(student.status || 'ACTIVE')}
                                        <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400">No admissions found.</div>
                        )}
                    </div>
                    {dashboardData?.recentAdmissions?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                            <button className="text-[12px] font-bold text-premium-blue hover:underline">View All Students</button>
                        </div>
                    )}
                </Card>

                {/* Course Rankings */}
                <Card className="premium-card">
                    <CardHeader 
                        title="Top Performing Courses" 
                        subtitle="Ranked by active seat occupancy"
                    />
                    <div className="space-y-6">
                        {loading ? (
                             Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />
                            ))
                        ) : dashboardData?.topCourses?.length > 0 ? (
                            dashboardData.topCourses.map((course, index) => {
                                const maxStudents = dashboardData.topCourses[0].totalStudents || 1;
                                const percentage = Math.round((course.totalStudents / maxStudents) * 100);
                                
                                return (
                                    <div key={course._id} className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-md bg-[#111827] text-white flex items-center justify-center text-[10px] font-black">
                                                    #{index + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-slate-900 leading-none">{course.name}</span>
                                                    {percentage >= 80 && <span className="text-[9px] font-black uppercase tracking-widest text-[#c2410c] mt-1 italic">🔥 Hot Demand</span>}
                                                </div>
                                            </div>
                                            <span className="text-[14px] font-black text-slate-900">{course.totalStudents} <span className="text-[11px] text-slate-400 font-bold ml-0.5 tracking-tighter uppercase">Students</span></span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    index === 0 ? "bg-premium-blue shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-slate-300"
                                                )}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center text-slate-400 italic font-medium">No course insights available yet.</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Performance Insights (Bar Chart Custom CSS) */}
            <Card className="premium-card relative overflow-hidden">
                <div className="absolute right-[-2.5rem] bottom-[-2.5rem] opacity-[0.03] select-none pointer-events-none">
                    <span className="text-[140px] font-black italic">₹{(dashboardData?.totalRevenue || 0).toLocaleString()}</span>
                </div>
                
                <CardHeader 
                    title="Admission Revenue Trends" 
                    subtitle="Real-time growth across key metrics"
                />

                <div className="flex items-end justify-between h-[280px] gap-4 pt-10 pb-4">
                    {loading ? (
                         Array(12).fill(0).map((_, i) => (
                            <div key={i} className="flex-1 bg-slate-50 animate-pulse rounded-t-xl h-24" />
                        ))
                    ) : dashboardData?.revenueTrends?.map((data, i) => {
                        const maxVal = Math.max(...dashboardData.revenueTrends.map(r => r.total)) || 1;
                        const heightPercent = Math.max(5, (data.total / maxVal) * 100);

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                {/* Value Tooltip Hover */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg -translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-10">
                                    ₹{data.total.toLocaleString()}
                                </div>
                                
                                <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${heightPercent}%` }}
                                    transition={{ delay: i * 0.05, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className={cn(
                                        "w-full rounded-t-xl transition-all duration-300",
                                        data.total === maxVal && data.total > 0 ? "bg-premium-blue shadow-[0_4px_15px_rgba(59,130,246,0.3)]" : "bg-slate-100 group-hover:bg-slate-200"
                                    )}
                                />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{data.label}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Student Lifecycle Overview */}
            <Card className="premium-card">
                <CardHeader 
                    title="Student Lifecycle Distribution" 
                    subtitle="Current status breakdown across entire institution"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
                    <div className="text-center">
                        <div className="text-3xl font-black text-slate-900 leading-tight">
                            {dashboardData?.counts?.activeRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Active Engagement</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-green-600 leading-tight">
                            {dashboardData?.counts?.completionRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Completion Success</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-red-600 leading-tight">
                            {dashboardData?.counts?.droppedRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Discontinuation</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-slate-400 leading-tight">
                            {dashboardData?.counts?.totalStudents || 0}
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Total Managed</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

