"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
    Users,
    User,
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
    Loader2,
    Calendar as CalendarIcon,
    Plus,
    Minus,
    X,
    Sparkles
} from "lucide-react";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
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
    const { sessions, selectedSessionId, changeSession, loading: loadingSessions } = useAcademicSession();
    const { data: session } = useSession();
    const toast = useToast();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [buySlots, setBuySlots] = useState(1);
    const [purchasing, setPurchasing] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBuySlots = async () => {
        try {
            setPurchasing(true);
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                toast.error("Failed to load payment gateway checkout client.");
                setPurchasing(false);
                return;
            }

            const orderRes = await fetch("/api/v1/billing/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slots: buySlots })
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to initiate purchase order");
            }

            const orderData = await orderRes.json();

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Quantech platform",
                description: `Purchase of ${buySlots} Student Limit Slots (adds ${buySlots * 10} students)`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        setPurchasing(true);
                        const verifyRes = await fetch("/api/v1/billing/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            })
                        });

                        if (!verifyRes.ok) {
                            const errData = await verifyRes.json().catch(() => ({}));
                            throw new Error(errData.error || "Payment verification failed");
                        }

                        const verifyData = await verifyRes.json();
                        toast.success(verifyData.message || "Purchase successful!");
                        setIsBuyModalOpen(false);
                        fetchStats();
                    } catch (error) {
                        toast.error(error.message);
                    } finally {
                        setPurchasing(false);
                    }
                },
                prefill: {
                    name: session?.user?.name || "",
                    email: session?.user?.email || ""
                },
                theme: {
                    color: "#2563EB"
                },
                modal: {
                    ondismiss: function () {
                        setPurchasing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            toast.error(error.message);
            setPurchasing(false);
        }
    };



    // Fetch stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            const url = (isSchool && selectedSessionId)
                ? `/api/v1/dashboard/stats?session=${selectedSessionId}`
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
        fetchStats();
        
        // Refetch stats when page becomes visible (e.g., when returning from completion-tracking page)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedSessionId]);

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
            title: isSchool ? "CLASSES ENROLLED" : "ENROLLMENTS", 
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
            {/* Subscription & Student Quota Status */}
            {isSchool && dashboardData?.subscription && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-6">
                        {/* Subscription Info */}
                        <div className="flex-1 flex gap-4 items-start md:border-r md:border-slate-100 md:pr-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                <CalendarIcon size={22} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subscription Plan</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                        {dashboardData.subscription.plan} Plan
                                    </span>
                                    <Badge variant={dashboardData.subscription.isActive ? "success" : "danger"} className="text-[10px] uppercase font-bold px-2 py-0.5">
                                        {dashboardData.subscription.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                    {dashboardData.subscription.endDate ? (
                                        dashboardData.subscription.remainingDays > 0 ? (
                                            <>
                                                <strong>{dashboardData.subscription.remainingDays} days</strong> remaining (Expires on {new Date(dashboardData.subscription.endDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })})
                                            </>
                                        ) : (
                                            <span className="text-rose-600 font-black">Subscription Expired! Please contact support to renew.</span>
                                        )
                                    ) : (
                                        <span className="text-emerald-600 font-bold">Lifetime Access / Active</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Student Limit Progress */}
                        <div className="flex-1 flex gap-4 items-start pl-0 md:pl-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <Users size={22} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Students Quota</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            <strong>{dashboardData.subscription.usedStudents}</strong> used of <strong>{dashboardData.subscription.maxStudents}</strong> allotted
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">
                                            {dashboardData.subscription.availableStudents} left
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBuySlots(1);
                                                setIsBuyModalOpen(true);
                                            }}
                                            className="text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-xl shadow-sm transition-all uppercase tracking-wider"
                                        >
                                            Buy Slots
                                        </button>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000",
                                            (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) >= 0.9 ? "bg-rose-500" : (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) >= 0.75 ? "bg-amber-500" : "bg-blue-500"
                                        )} 
                                        style={{ width: `${Math.min(100, (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Purchase Extra Slots Modal */}
            {/* Purchase Extra Slots Modal */}
            {mounted && typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {isBuyModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !purchasing && setIsBuyModalOpen(false)}
                                className="fixed inset-0 bg-slate-900/50"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 p-8 flex flex-col z-[10000]"
                            >
                                <header className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Buy Student Slots</h2>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">Extend your active student quota</p>
                                    </div>
                                    <button
                                        onClick={() => setIsBuyModalOpen(false)}
                                        disabled={purchasing}
                                        className="p-2 hover:bg-slate-105 rounded-xl text-slate-400 transition-colors disabled:opacity-50"
                                    >
                                        <X size={18} />
                                    </button>
                                </header>

                                <div className="space-y-6">
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100/60 flex items-start gap-3">
                                        <Sparkles className="text-blue-600 mt-0.5 shrink-0 animate-pulse" size={16} />
                                        <p className="text-xs text-blue-750/90 font-semibold leading-relaxed">
                                            Each slot instantly increases your student registration limit by <strong>10 capacity seats</strong> permanently.
                                        </p>
                                    </div>

                                    <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Select Quantity</span>
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                +{buySlots * 10} seats
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-800">Extra Quota Slots</span>
                                            <div className="flex items-center gap-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
                                                <button
                                                    type="button"
                                                    disabled={buySlots <= 1 || purchasing}
                                                    onClick={() => setBuySlots(prev => prev - 1)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-505 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-base font-black text-slate-800 w-6 text-center select-none">{buySlots}</span>
                                                <button
                                                    type="button"
                                                    disabled={purchasing}
                                                    onClick={() => setBuySlots(prev => prev + 1)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-505 hover:bg-slate-100 disabled:opacity-30 transition-all"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-5 space-y-3">
                                        <div className="flex justify-between text-xs text-slate-500 font-bold">
                                            <span>Capacity Added:</span>
                                            <span className="text-slate-800 font-extrabold">{buySlots * 10} Students</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-bold">
                                            <span>Rate per Slot:</span>
                                            <span className="text-slate-800 font-extrabold">₹590 INR</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Price</span>
                                            <span className="text-lg font-black text-slate-900 bg-blue-50 text-blue-600 px-3 py-1 rounded-xl">
                                                ₹{buySlots * 590} INR
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBuySlots}
                                        disabled={purchasing}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                                    >
                                        {purchasing ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={16} />
                                                Pay
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

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

            {/* Gender Demographics Banner */}
            {dashboardData?.counts && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="premium-card p-6 overflow-hidden relative border-l-4 border-indigo-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} className="text-indigo-600" />
                                    Student Demographics
                                </h3>
                                <p className="text-[12px] font-medium text-slate-500">Gender distribution of active enrollments</p>
                            </div>
                            
                            <div className="flex-1 max-w-2xl w-full">
                                <div className="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-wider">
                                    <div className="text-indigo-600 flex items-center gap-1">
                                        <User size={12} /> Boys ({(dashboardData.counts.maleStudents || 0).toLocaleString()})
                                    </div>
                                    <div className="text-pink-600 flex items-center gap-1">
                                        <User size={12} /> Girls ({(dashboardData.counts.femaleStudents || 0).toLocaleString()})
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    {loading ? (
                                        <div className="w-full h-full bg-slate-200 animate-pulse" />
                                    ) : (
                                        <>
                                            <div 
                                                className="h-full bg-indigo-500 transition-all duration-1000" 
                                                style={{ width: `${dashboardData.counts.totalStudents > 0 ? (dashboardData.counts.maleStudents / dashboardData.counts.totalStudents) * 100 : 50}%` }}
                                            />
                                            <div 
                                                className="h-full bg-pink-500 transition-all duration-1000" 
                                                style={{ width: `${dashboardData.counts.totalStudents > 0 ? (dashboardData.counts.femaleStudents / dashboardData.counts.totalStudents) * 100 : 50}%` }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

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
                        title={isSchool ? "Top Performing Classes" : "Top Performing Courses"} 
                        subtitle={`Ranked by active seat occupancy`}
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

