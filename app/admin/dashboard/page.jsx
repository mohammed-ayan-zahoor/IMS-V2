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
    ChevronRight,
    Calendar,
    Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import StudentSearch from "@/components/admin/StudentSearch";

const StatCard = ({ title, value, icon: Icon, trend, trendType = "up", colorClass }) => (
    <Card padding="p-6" className={cn("premium-card-hover group", colorClass)}>
        <div className="flex justify-between items-start mb-4">
            <span className="section-label">{title}</span>
            <div className="transition-colors">
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
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const { data: session } = useSession();

    // Fetch sessions
    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await fetch("/api/v1/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
                
                // Select active session by default
                const activeSess = data.sessions?.find(s => s.isActive);
                if (activeSess) {
                    setSelectedSession(activeSess._id);
                    localStorage.setItem('selectedSession', activeSess._id);
                }
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoadingSessions(false);
        }
    };

    // Fetch stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            const url = selectedSession 
                ? `/api/v1/dashboard/stats?session=${selectedSession}`
                : '/api/v1/dashboard/stats';
            const res = await fetch(url);
            if (res.ok) setDashboardData(await res.json());
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

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
    }, [selectedSession]);

    const stats = [
        { 
            title: "ACTIVE STUDENTS", 
            value: loading ? "0" : (dashboardData?.counts?.activeStudents || 0).toLocaleString(), 
            icon: Users, 
            trend: `${dashboardData?.trends?.student >= 0 ? '+' : ''}${dashboardData?.trends?.student || 0}%`, 
            trendType: (dashboardData?.trends?.student || 0) >= 0 ? "up" : "down",
            colorClass: "bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600"
        },
        { 
            title: "COMPLETED", 
            value: loading ? "0" : (dashboardData?.counts?.completedStudents || 0).toLocaleString(), 
            icon: Trophy, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.completedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral",
            colorClass: "bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-600"
        },
        { 
            title: "DROPPED", 
            value: loading ? "0" : (dashboardData?.counts?.droppedStudents || 0).toLocaleString(), 
            icon: AlertCircle, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.droppedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral",
            colorClass: "bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-600"
        },
        { 
            title: "ENROLLMENTS", 
            value: loading ? "0" : (dashboardData?.counts?.coursesEnrolled || 0).toLocaleString(), 
            icon: BookOpen, 
            trend: `${dashboardData?.trends?.enrollment >= 0 ? '+' : ''}${dashboardData?.trends?.enrollment || 0}%`, 
            trendType: (dashboardData?.trends?.enrollment || 0) >= 0 ? "up" : "down",
            colorClass: "bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-600"
        },
        { 
            title: "ENQUIRIES", 
            value: loading ? "0" : (dashboardData?.counts?.enquiries || 0).toLocaleString(), 
            icon: MessageSquare, 
            trend: `${dashboardData?.trends?.enquiry >= 0 ? '+' : ''}${dashboardData?.trends?.enquiry || 0}%`, 
            trendType: (dashboardData?.trends?.enquiry || 0) >= 0 ? "up" : "down",
            colorClass: "bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-cyan-600"
        },
        { 
            title: "STAFF", 
            value: loading ? "0" : (dashboardData?.counts?.staff || 0).toLocaleString(), 
            icon: Layers3, 
            trend: "+0%", 
            trendType: "up",
            colorClass: "bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-600"
        }
    ];



    return (
        <div className="space-y-10">
            {/* Session Selector */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                    <Calendar className="text-blue-600" size={20} />
                    <div>
                        <p className="text-sm font-bold text-slate-900">Academic Session</p>
                        <p className="text-xs text-slate-500">All data below is filtered by selected session</p>
                    </div>
                </div>
                <div className="min-w-[200px]">
                    {loadingSessions ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm text-slate-600">Loading sessions...</span>
                        </div>
                    ) : sessions.length > 0 ? (
                        <select
                            value={selectedSession || ''}
                            onChange={(e) => {
                                setSelectedSession(e.target.value);
                                localStorage.setItem('selectedSession', e.target.value);
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-blue-300 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        >
                            {sessions.map((sess) => (
                                <option key={sess._id} value={sess._id}>
                                    {sess.sessionName} {sess.isActive ? '(Active)' : ''}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="text-sm text-slate-600 font-medium">
                            No sessions available. Create one in Settings.
                        </div>
                    )}
                </div>
            </div>

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
                            dashboardData.recentAdmissions.map((student, idx) => {
                                const avatarColors = ['bg-blue-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-red-500', 'bg-amber-500'];
                                const avatarBgColor = avatarColors[idx % avatarColors.length];
                                return (
                                    <div 
                                        key={student._id} 
                                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50/80 group transition-all cursor-default"
                                    >
                                        <div className={`w-10 h-10 rounded-full ${avatarBgColor} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
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
                                );
                            })
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
                                const barColors = ['bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600', 'bg-red-600', 'bg-amber-600'];
                                const barColor = barColors[index % barColors.length];
                                const rankBgColors = ['bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600'];
                                const rankBg = rankBgColors[index % rankBgColors.length];
                                
                                return (
                                    <div key={course._id} className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-md ${rankBg} text-white flex items-center justify-center text-[10px] font-black`}>
                                                    #{index + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-slate-900 leading-none">{course.name}</span>
                                                    {percentage >= 80 && <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 mt-1 italic">🔥 Hot Demand</span>}
                                                </div>
                                            </div>
                                            <span className="text-[14px] font-black text-slate-900">{course.totalStudents} <span className="text-[11px] text-slate-400 font-bold ml-0.5 tracking-tighter uppercase">Students</span></span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000 shadow-md",
                                                    barColor
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
                        const chartColors = ['bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600', 'bg-red-600', 'bg-amber-600', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-red-500', 'bg-amber-500'];
                        const barColor = chartColors[i % chartColors.length];

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
                                        "w-full rounded-t-xl transition-all duration-300 shadow-md",
                                        barColor
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
                    <div className="text-center p-4 rounded-lg bg-blue-50">
                        <div className="text-3xl font-black text-blue-600 leading-tight">
                            {dashboardData?.counts?.activeRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Active Engagement</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-teal-50">
                        <div className="text-3xl font-black text-teal-600 leading-tight">
                            {dashboardData?.counts?.completionRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Completion Success</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-50">
                        <div className="text-3xl font-black text-red-600 leading-tight">
                            {dashboardData?.counts?.droppedRate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Discontinuation</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-orange-50">
                        <div className="text-3xl font-black text-orange-600 leading-tight">
                            {dashboardData?.counts?.totalStudents || 0}
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2">Total Managed</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

