"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Badge from "@/components/ui/Badge";
import {
    Users,
    User,
    BookOpen,
    Layers3,
    CreditCard,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
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
import InstructorMobileDashboard from "@/components/instructor/InstructorMobileDashboard";
import ActivityFeed from "@/components/admin/ActivityFeed";

const StatCard = ({ title, value, icon: Icon, trend, trendType = "up", colorClass, iconColorClass }) => (
    <div className={cn("rounded-lg border p-5 transition-colors", colorClass)}>
        <div className="flex justify-between items-start mb-3">
            <span className="section-label">{title}</span>
            <div className={iconColorClass}>
                <Icon size={20} />
            </div>
        </div>
        <div className="flex flex-col gap-1">
            <h2 className="metric-value text-slate-900">{value}</h2>
            <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1",
                    trendType === "up" ? "bg-emerald-50 text-emerald-700" : trendType === "down" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                )}>
                    {trendType === "up" ? <TrendingUp size={11} /> : trendType === "down" ? <TrendingUp size={11} className="rotate-180" /> : <Clock size={11} />}
                    {trend}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                    {trend.includes('%') ? 'vs last month' : 'summary'}
                </span>
            </div>
        </div>
    </div>
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
    
    const instituteType = session?.user?.institute?.type || 'VOCATIONAL';
    const isSchool = instituteType === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const isCollege = instituteType === 'COLLEGE';
    const hasAcademicStructure = isSchool || isCollege;
    const isVocational = !hasAcademicStructure;

    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [buySlots, setBuySlots] = useState(1);
    const [purchasing, setPurchasing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [rankingFilter, setRankingFilter] = useState("top"); // "top" | "least"

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
            const url = (hasAcademicStructure && selectedSessionId)
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
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedSessionId]);

    const stats = hasAcademicStructure ? [
        { 
            title: "ACTIVE STUDENTS", 
            value: loading ? "0" : (dashboardData?.counts?.activeStudents || 0).toLocaleString(), 
            icon: Users, 
            trend: `${dashboardData?.trends?.student >= 0 ? '+' : ''}${dashboardData?.trends?.student || 0}%`, 
            trendType: (dashboardData?.trends?.student || 0) >= 0 ? "up" : "down",
            colorClass: "bg-blue-50/70 border-blue-100/70",
            iconColorClass: "text-blue-600"
        },
        { 
            title: isSchool ? "CLASSES ENROLLED" : isCollege ? "PROGRAMS ENROLLED" : "COURSES ENROLLED", 
            value: loading ? "0" : (dashboardData?.counts?.coursesEnrolled || 0).toLocaleString(), 
            icon: BookOpen, 
            trend: `${dashboardData?.trends?.enrollment >= 0 ? '+' : ''}${dashboardData?.trends?.enrollment || 0}%`, 
            trendType: (dashboardData?.trends?.enrollment || 0) >= 0 ? "up" : "down",
            colorClass: "bg-orange-50/70 border-orange-100/70",
            iconColorClass: "text-orange-600"
        },
        { 
            title: "ENQUIRIES", 
            value: loading ? "0" : (dashboardData?.counts?.enquiries || 0).toLocaleString(), 
            icon: MessageSquare, 
            trend: `${dashboardData?.trends?.enquiry >= 0 ? '+' : ''}${dashboardData?.trends?.enquiry || 0}%`, 
            trendType: (dashboardData?.trends?.enquiry || 0) >= 0 ? "up" : "down",
            colorClass: "bg-cyan-50/70 border-cyan-100/70",
            iconColorClass: "text-cyan-600"
        },
        { 
            title: isCollege ? "FACULTY & STAFF" : "STAFF", 
            value: loading ? "0" : (dashboardData?.counts?.staff || 0).toLocaleString(), 
            icon: Layers3, 
            trend: "+0%", 
            trendType: "up",
            colorClass: "bg-amber-50/70 border-amber-100/70",
            iconColorClass: "text-amber-600"
        }
    ] : [
        { 
            title: "ACTIVE STUDENTS", 
            value: loading ? "0" : (dashboardData?.counts?.activeStudents || 0).toLocaleString(), 
            icon: Users, 
            trend: `${dashboardData?.trends?.student >= 0 ? '+' : ''}${dashboardData?.trends?.student || 0}%`, 
            trendType: (dashboardData?.trends?.student || 0) >= 0 ? "up" : "down",
            colorClass: "bg-blue-50/70 border-blue-100/70",
            iconColorClass: "text-blue-600"
        },
        { 
            title: "COMPLETED", 
            value: loading ? "0" : (dashboardData?.counts?.completedStudents || 0).toLocaleString(), 
            icon: Trophy, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.completedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral",
            colorClass: "bg-teal-50/70 border-teal-100/70",
            iconColorClass: "text-teal-600"
        },
        { 
            title: "DROPPED", 
            value: loading ? "0" : (dashboardData?.counts?.droppedStudents || 0).toLocaleString(), 
            icon: AlertCircle, 
            trend: dashboardData?.counts?.totalStudents > 0 
                ? `${Math.round((dashboardData.counts.droppedStudents / dashboardData.counts.totalStudents) * 100)}%`
                : "0%",
            trendType: "neutral",
            colorClass: "bg-rose-50/70 border-rose-100/70",
            iconColorClass: "text-rose-600"
        },
        { 
            title: "ENROLLMENTS", 
            value: loading ? "0" : (dashboardData?.counts?.coursesEnrolled || 0).toLocaleString(), 
            icon: BookOpen, 
            trend: `${dashboardData?.trends?.enrollment >= 0 ? '+' : ''}${dashboardData?.trends?.enrollment || 0}%`, 
            trendType: (dashboardData?.trends?.enrollment || 0) >= 0 ? "up" : "down",
            colorClass: "bg-orange-50/70 border-orange-100/70",
            iconColorClass: "text-orange-600"
        },
        { 
            title: "ENQUIRIES", 
            value: loading ? "0" : (dashboardData?.counts?.enquiries || 0).toLocaleString(), 
            icon: MessageSquare, 
            trend: `${dashboardData?.trends?.enquiry >= 0 ? '+' : ''}${dashboardData?.trends?.enquiry || 0}%`, 
            trendType: (dashboardData?.trends?.enquiry || 0) >= 0 ? "up" : "down",
            colorClass: "bg-cyan-50/70 border-cyan-100/70",
            iconColorClass: "text-cyan-600"
        },
        { 
            title: "STAFF", 
            value: loading ? "0" : (dashboardData?.counts?.staff || 0).toLocaleString(), 
            icon: Layers3, 
            trend: "+0%", 
            trendType: "up",
            colorClass: "bg-amber-50/70 border-amber-100/70",
            iconColorClass: "text-amber-600"
        }
    ];

    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <InstructorMobileDashboard />
                </div>
            )}

            <div className={cn("space-y-6", isInstructorOrStaff ? "hidden md:block" : "")}>
                {/* Subscription & Student Quota Status */}
                {hasAcademicStructure && dashboardData?.subscription && (
                    <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-stretch gap-6">
                        {/* Subscription Info */}
                        <div className="flex-1 flex gap-4 items-start md:border-r md:border-slate-100 md:pr-6">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100/60">
                                <CalendarIcon size={18} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subscription Plan</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-slate-900 uppercase tracking-tight">
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
                                                <strong className="text-slate-700">{dashboardData.subscription.remainingDays} days</strong> remaining (Expires on {new Date(dashboardData.subscription.endDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })})
                                            </>
                                        ) : (
                                            <span className="text-rose-600 font-bold">Subscription Expired! Please contact support to renew.</span>
                                        )
                                    ) : (
                                        <span className="text-emerald-600 font-bold">Lifetime Access / Active</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Student Limit Progress */}
                        <div className="flex-1 flex gap-4 items-start pl-0 md:pl-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/60">
                                <Users size={18} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Students Quota</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            <strong className="text-slate-700">{dashboardData.subscription.usedStudents}</strong> used of <strong className="text-slate-700">{dashboardData.subscription.maxStudents}</strong> allotted
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            {dashboardData.subscription.availableStudents} left
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBuySlots(1);
                                                setIsBuyModalOpen(true);
                                            }}
                                            className="text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded transition-colors uppercase tracking-wider"
                                        >
                                            Buy Slots
                                        </button>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) >= 0.9 ? "bg-rose-500" : (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) >= 0.75 ? "bg-amber-500" : "bg-blue-600"
                                        )} 
                                        style={{ width: `${Math.min(100, (dashboardData.subscription.usedStudents / dashboardData.subscription.maxStudents) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                                    className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col z-[10000]"
                                >
                                    <header className="flex items-center justify-between mb-5">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Buy Student Slots</h2>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">Extend your active student quota</p>
                                        </div>
                                        <button
                                            onClick={() => setIsBuyModalOpen(false)}
                                            disabled={purchasing}
                                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            <X size={16} />
                                        </button>
                                    </header>

                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100/60 flex items-start gap-2.5">
                                            <Sparkles className="text-blue-600 mt-0.5 shrink-0" size={15} />
                                            <p className="text-xs text-blue-900/90 font-medium leading-relaxed">
                                                Each slot instantly increases your student registration limit by <strong>10 capacity seats</strong> permanently.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Quantity</span>
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                                                    +{buySlots * 10} seats
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800">Extra Quota Slots</span>
                                                <div className="flex items-center gap-3 bg-white border border-slate-200 p-1 rounded-lg">
                                                    <button
                                                        type="button"
                                                        disabled={buySlots <= 1 || purchasing}
                                                        onClick={() => setBuySlots(prev => prev - 1)}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                    >
                                                        <Minus size={13} />
                                                    </button>
                                                    <span className="text-sm font-bold text-slate-800 w-5 text-center select-none">{buySlots}</span>
                                                    <button
                                                        type="button"
                                                        disabled={purchasing}
                                                        onClick={() => setBuySlots(prev => prev + 1)}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 space-y-2.5">
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Capacity Added:</span>
                                                <span className="text-slate-800 font-bold">{buySlots * 10} Students</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Rate per Slot:</span>
                                                <span className="text-slate-800 font-bold">₹590 INR</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>GST (18%):</span>
                                                <span className="text-slate-800 font-bold">₹{(buySlots * 106.2).toFixed(2)} INR</span>
                                            </div>
                                            <div className="h-px bg-slate-200 my-1" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Price</span>
                                                <span className="text-base font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded">
                                                    ₹{(buySlots * 696.2).toFixed(2)} INR
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleBuySlots}
                                            disabled={purchasing}
                                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {purchasing ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" />
                                                    Processing Payment...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={15} />
                                                    Pay Now
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
                <div className={cn(
                    "grid gap-4",
                    hasAcademicStructure ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                )}>
                    {stats.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </div>

                {/* Main Dashboard Layout: Analytics (8-cols) + Live Audit Trail & Shortcuts (4-cols) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left Analytics & Operations Area */}
                    <div className="xl:col-span-8 space-y-6">
                        {/* Gender Demographics Banner */}
                        {dashboardData?.counts && (
                            <div className="bg-white rounded-lg border border-slate-100 p-5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-0.5">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <Users size={15} className="text-slate-500" />
                                            Student Demographics
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium">Gender distribution of active enrollments</p>
                                    </div>
                                    
                                    <div className="flex-1 max-w-xl w-full">
                                        <div className="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-wider">
                                            <div className="text-blue-600 flex items-center gap-1">
                                                <User size={12} /> Boys ({(dashboardData.counts.maleStudents || 0).toLocaleString()})
                                            </div>
                                            <div className="text-pink-600 flex items-center gap-1">
                                                <User size={12} /> Girls ({(dashboardData.counts.femaleStudents || 0).toLocaleString()})
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            {loading ? (
                                                <div className="w-full h-full bg-slate-200 animate-pulse" />
                                            ) : (
                                                <>
                                                    <div 
                                                        className="h-full bg-blue-500 transition-all duration-700" 
                                                        style={{ width: `${dashboardData.counts.totalStudents > 0 ? (dashboardData.counts.maleStudents / dashboardData.counts.totalStudents) * 100 : 50}%` }}
                                                    />
                                                    <div 
                                                        className="h-full bg-pink-500 transition-all duration-700" 
                                                        style={{ width: `${dashboardData.counts.totalStudents > 0 ? (dashboardData.counts.femaleStudents / dashboardData.counts.totalStudents) * 100 : 50}%` }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Admissions List */}
                            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden flex flex-col">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-900">Recent Admissions</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Chronological list of newly enrolled students</p>
                                </div>
                                <div className="divide-y divide-slate-50 flex-1">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <div key={i} className="h-14 bg-slate-50/50 animate-pulse m-3 rounded" />
                                        ))
                                    ) : dashboardData?.recentAdmissions?.length > 0 ? (
                                        dashboardData.recentAdmissions.map((student, idx) => (
                                            <div 
                                                key={student._id} 
                                                className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50/60 transition-colors cursor-default"
                                            >
                                                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200/60">
                                                    {student.profile?.firstName?.[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">
                                                        {student.profile?.firstName} {student.profile?.lastName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-mono">#{student.enrollmentNumber}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(student.status || 'ACTIVE')}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-14 text-center text-xs text-slate-400">No admissions found.</div>
                                    )}
                                </div>
                                {dashboardData?.recentAdmissions?.length > 0 && (
                                    <div className="px-5 py-3 border-t border-slate-100 bg-[#f9fafb] text-center">
                                        <button className="text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors">View All Students →</button>
                                    </div>
                                )}
                            </div>

                            {/* Course / Class Rankings with Top/Least Toggle */}
                            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden flex flex-col">
                                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {rankingFilter === "top" 
                                                ? (isSchool ? "Top Performing Classes" : isCollege ? "Top Performing Programs" : "Top Performing Courses")
                                                : (isSchool ? "Least Performing Classes" : isCollege ? "Least Performing Programs" : "Least Performing Courses")
                                            }
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                                            {rankingFilter === "top" ? "Ranked by highest seat occupancy" : "Ranked by lowest seat occupancy"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setRankingFilter("top")}
                                            className={cn(
                                                "px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1",
                                                rankingFilter === "top"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <TrendingUp size={12} className={rankingFilter === "top" ? "text-emerald-600" : ""} />
                                            <span>Top</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRankingFilter("least")}
                                            className={cn(
                                                "px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1",
                                                rankingFilter === "least"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <TrendingDown size={12} className={rankingFilter === "least" ? "text-rose-600" : ""} />
                                            <span>Least</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4 flex-1">
                                    {loading ? (
                                         Array(4).fill(0).map((_, i) => (
                                            <div key={i} className="h-10 bg-slate-50 animate-pulse rounded" />
                                        ))
                                    ) : (() => {
                                        const allCourses = dashboardData?.topCourses || [];
                                        if (allCourses.length === 0) {
                                            return <div className="py-14 text-center text-xs text-slate-400 italic">No class insights available yet.</div>;
                                        }

                                        const maxStudents = Math.max(...allCourses.map(c => c.totalStudents), 1);
                                        const sortedCourses = [...allCourses].sort((a, b) => {
                                            if (rankingFilter === "least") {
                                                return a.totalStudents - b.totalStudents || a.name.localeCompare(b.name);
                                            }
                                            return b.totalStudents - a.totalStudents || a.name.localeCompare(b.name);
                                        }).slice(0, 5);

                                        return sortedCourses.map((course, index) => {
                                            const percentage = Math.round((course.totalStudents / maxStudents) * 100);
                                            
                                            return (
                                                <div key={course._id} className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold font-mono">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-800">{course.name}</span>
                                                            {rankingFilter === "top" && percentage >= 80 && course.totalStudents > 0 && (
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Hot</span>
                                                            )}
                                                            {rankingFilter === "least" && course.totalStudents === 0 && (
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">0 Enrolled</span>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-slate-700 font-bold">{course.totalStudents} <span className="text-[10px] text-slate-400 font-normal">students</span></span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-700",
                                                                rankingFilter === "least" ? "bg-rose-500" : "bg-slate-800"
                                                            )}
                                                            style={{ width: `${Math.max(percentage, course.totalStudents > 0 ? 4 : 0)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Student Lifecycle Overview - Vocational Only */}
                        {isVocational && (
                            <div className="bg-white rounded-lg border border-slate-100 p-5">
                                <div className="mb-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Student Lifecycle Distribution</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Current status breakdown across entire institution</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 pt-2">
                                    <div className="text-center py-3 px-4">
                                        <div className="text-2xl font-bold text-slate-900 leading-tight">
                                            {dashboardData?.counts?.activeRate?.toFixed(1) || 0}%
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Active Engagement</p>
                                    </div>
                                    <div className="text-center py-3 px-4">
                                        <div className="text-2xl font-bold text-emerald-600 leading-tight">
                                            {dashboardData?.counts?.completionRate?.toFixed(1) || 0}%
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Completion Success</p>
                                    </div>
                                    <div className="text-center py-3 px-4">
                                        <div className="text-2xl font-bold text-rose-600 leading-tight">
                                            {dashboardData?.counts?.droppedRate?.toFixed(1) || 0}%
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Discontinuation</p>
                                    </div>
                                    <div className="text-center py-3 px-4">
                                        <div className="text-2xl font-bold text-slate-900 leading-tight">
                                            {dashboardData?.counts?.totalStudents || 0}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Total Managed</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right 4-Columns: Live Audit Activity & Quick Executive Shortcuts */}
                    <div className="xl:col-span-4">
                        <ActivityFeed />
                    </div>
                </div>
            </div>
        </>
    );
}

