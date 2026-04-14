"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import {
    Users,
    BookOpen,
    Layers3,
    CreditCard,
    ArrowUpRight,
    TrendingUp,
    Trophy,
    AlertCircle,
    Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import StudentSearch from "@/components/admin/StudentSearch";

const StatCard = ({ title, value, icon: Icon, trend, color, softColor }) => (
    <Card className={cn("transition-all cursor-default border-transparent shadow-sm", softColor)}>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-900 bg-white/60 px-2.5 py-1 rounded-full border border-white/40">
                <TrendingUp size={12} className="opacity-60" />
                <span>{trend}</span>
            </div>
            <div className="text-slate-900/40 p-1">
                <Icon size={18} />
            </div>
        </div>
        <div className="mt-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h2>
            <p className="text-[11px] font-bold text-slate-900/50 uppercase tracking-widest mt-1">{title}</p>
        </div>
    </Card>
);

export default function AdminDashboard() {

    const [dashboardData, setDashboardData] = useState(null);
    const [staleBatches, setStaleBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateString, setDateString] = useState("");
    const { data: session } = useSession();

    // Set formatted date only on client side to avoid hydration mismatch
    useEffect(() => {
        setDateString(new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/v1/dashboard/stats', {
                    signal: controller.signal
                });
                
                // Fetch stale batches if user is instructor or admin
                if (session && ['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
                    fetch('/api/v1/syllabus-progress/stale?days=7', { signal: controller.signal })
                        .then(r => r.ok && r.json()).then(d => d && setStaleBatches(d.stale || []))
                        .catch(() => {});
                }

                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    setDashboardData(data);
                } else {
                    setError(`Failed to fetch dashboard data: ${res.status}`);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Dashboard fetch error:", error);
                    setError("Unable to load dashboard data. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchStats();

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [session]);

    const stats = [
        {
            title: "Students",
            value: loading ? "-" : (dashboardData?.counts?.students || 0).toLocaleString(),
            icon: Users,
            trend: "+0%",
            softColor: "bg-soft-purple"
        },
        {
            title: "Courses Enrolled",
            value: loading ? "-" : (dashboardData?.counts?.coursesEnrolled || 0).toLocaleString(),
            icon: BookOpen,
            trend: "+0%",
            softColor: "bg-soft-yellow"
        },
        {
            title: "Staff",
            value: loading ? "-" : (dashboardData?.counts?.staff || 0).toLocaleString(),
            icon: Layers3,
            trend: "+0%",
            softColor: "bg-soft-blue"
        },
        {
            title: "Total Enquiries",
            value: loading ? "-" : (dashboardData?.counts?.enquiries || 0).toLocaleString(),
            icon: TrendingUp,
            trend: "+0%",
            softColor: "bg-soft-emerald"
        },
    ];

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Institute Overview</h1>
                    <p className="text-slate-500 mt-1 font-medium">Real-time performance metrics and admission trends.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <StudentSearch />
                    <div className="hidden sm:block">
                        <div className="bg-slate-50 border border-border px-4 py-2 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {dateString || "Loading..."}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-border shadow-sm">
                    <CardHeader
                        title="Recent Admissions"
                        subtitle="Latest student enrollments"
                    />
                    <CardContent>
                        <div className="divide-y divide-slate-100">
                            {loading ? (
                                <div className="py-8 text-center text-slate-400 text-sm">Loading admissions...</div>
                            ) : dashboardData?.recentAdmissions?.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">No recent admissions found.</div>
                            ) : (
                                dashboardData?.recentAdmissions?.map((student) => (
                                    <div key={student._id || student.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group cursor-pointer">
                                        <div className="w-10 h-10 rounded-lg bg-soft-blue flex items-center justify-center text-premium-blue group-hover:bg-premium-blue group-hover:text-white transition-colors border border-blue-100/50">
                                            <Users size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900">
                                                {student.profile?.firstName} {student.profile?.lastName}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                {student.enrollmentNumber || "Pending ID"}
                                            </p>
                                        </div>
                                        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-premium-blue transition-colors" />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm overflow-hidden">
                    <CardHeader
                        title="Top Courses"
                        subtitle="Ranked by active student enrollments"
                    />
                    <CardContent className="pt-0">
                        <div className="space-y-4 pt-4">
                            {loading ? (
                                <div className="py-8 text-center text-slate-400 text-sm italic">Analyzing course intelligence...</div>
                            ) : dashboardData?.topCourses?.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-4">
                                        <BookOpen size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 tracking-tight">No course activity yet.</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Start enrolling students to see insights.</p>
                                </div>
                            ) : (() => {
                                if (!dashboardData?.topCourses) return null;
                                const maxStudents = dashboardData.topCourses[0]?.totalStudents || 1;
                                return dashboardData.topCourses.map((course, index) => {
                                    const percentage = Math.round((course.totalStudents / maxStudents) * 100);
                                    const isTie = dashboardData.topCourses.length > 1 && 
                                                 dashboardData.topCourses.every(c => c.totalStudents === dashboardData.topCourses[0].totalStudents);

                                    // Demand Badge Logic
                                    let badge = null;
                                    if (!isTie) {
                                        if (percentage >= 80) badge = { text: "🔥 Hot Demand", color: "text-orange-600 bg-orange-50 border-orange-100" };
                                        else if (percentage <= 40) badge = { text: "⚠️ Needs Attention", color: "text-slate-500 bg-slate-50 border-slate-100" };
                                    }

                                    return (
                                        <a 
                                            href={`/admin/courses`} 
                                            key={course._id} 
                                            className={cn(
                                                "flex flex-col gap-3 p-4 rounded-xl border transition-all duration-300 group cursor-pointer block",
                                                index === 0 
                                                    ? "bg-gradient-to-br from-premium-blue/[0.04] to-premium-blue/[0.01] border-premium-blue/20 shadow-sm scale-[1.02] sm:scale-[1.04] hover:scale-[1.06]" 
                                                    : "bg-white border-slate-100 hover:border-premium-blue/20 hover:shadow-md hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black tracking-tighter shadow-sm shrink-0 transition-transform group-hover:rotate-3",
                                                        index === 0 ? "bg-premium-blue text-white ring-4 ring-premium-blue/10" : "bg-slate-50 text-slate-400 border border-slate-100"
                                                    )}>
                                                        #{index + 1}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-sm font-bold tracking-tight line-clamp-1 transition-colors",
                                                                index === 0 ? "text-slate-900" : "text-slate-700 group-hover:text-premium-blue"
                                                            )}>
                                                                {course.name}
                                                            </span>
                                                            {badge && (
                                                                <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full border border-transparent uppercase tracking-wider whitespace-nowrap", badge.color)}>
                                                                    {badge.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            Growth Rank {index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className={cn(
                                                        "text-sm font-black tracking-tight",
                                                        index === 0 ? "text-premium-blue" : "text-slate-700"
                                                    )}>
                                                        {course.totalStudents || 0}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                        Students
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Relative Strength Progress Bar */}
                                            <div className="w-full space-y-1.5">
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                                        className={cn(
                                                            "h-full rounded-full shadow-sm",
                                                            index === 0 ? "bg-premium-blue" : "bg-premium-blue/40"
                                                        )}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter italic">
                                                    <span className="text-slate-300">
                                                        {isTie && index !== 0 ? "Equal performance" : ""}
                                                    </span>
                                                    <span className="text-slate-300">
                                                        {percentage}% relative strength
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    );
                                });
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {session && ['admin', 'super_admin', 'instructor'].includes(session.user?.role) && staleBatches.length > 0 && (
                    <Card className="border-border shadow-sm border-orange-200 lg:col-span-2">
                        <CardHeader
                            title={<span className="flex items-center gap-2 text-orange-600"><AlertCircle size={18} /> Inactive Syllabus Trackers</span>}
                            subtitle={`You have ${staleBatches.length} batch(es) with no syllabus updates in the last 7 days.`}
                        />
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {staleBatches.map(pg => (
                                    <div key={pg._id} className="p-3 rounded-lg border border-orange-100 bg-orange-50/50 flex items-start gap-3">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-md shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{pg.batch?.name || 'Unknown Batch'}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{pg.subject?.name || 'Unknown Subject'}</p>
                                            <p className="text-[10px] uppercase font-bold text-orange-600 mt-1">
                                                {pg.lastActivityAt ? `Last active: ${new Date(pg.lastActivityAt).toLocaleDateString()}` : 'Never active'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
