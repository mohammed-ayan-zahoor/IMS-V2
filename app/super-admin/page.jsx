"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Building2,
    Users,
    CreditCard,
    Plus,
    ArrowRight,
    Zap,
    Activity,
    Database,
    Globe
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SuperAdminDashboard() {
    const toast = useToast();
    const [stats, setStats] = useState({
        institutes: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        trendInstitutes: "...",
        trendUsers: "...",
        trendSubscriptions: "..."
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/admin/stats", { signal: controller.signal });
                if (!res.ok) throw new Error("Failed to load stats");
                const data = await res.json();
                setStats({
                    institutes: data.institutes || 0,
                    totalUsers: data.totalUsers || 0,
                    activeSubscriptions: data.activeSubscriptions || 0,
                    trendInstitutes: data.trendInstitutes || "+0% this month",
                    trendUsers: data.trendUsers || "+0 today",
                    trendSubscriptions: data.trendSubscriptions || "+0 new trials"
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Stats fetch error:", error);
                    setError("Failed to load dashboard stats.");
                    toast.error("Failed to load dashboard stats");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-red-50 border border-red-100 rounded-3xl flex flex-col items-center text-center gap-4"
            >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Zap size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">System Error</h3>
                    <p className="text-red-600/80 font-medium">{error}</p>
                </div>
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                    Retry Connection
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-10">
            <header>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                    System Overview
                </h1>
                <p className="text-slate-500 font-medium">Monitoring the pulse of your education platform.</p>
            </header>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <StatCard
                    title="Total Institutes"
                    value={stats.institutes}
                    icon={Building2}
                    color="blue"
                    trend={stats.trendInstitutes}
                />
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="emerald"
                    trend={stats.trendUsers}
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon={CreditCard}
                    color="amber"
                    trend={stats.trendSubscriptions}
                />
            </motion.div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-3 bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Quick Actions</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ActionLink
                            href="/super-admin/institutes/create"
                            icon={Plus}
                            title="Register Institute"
                            description="Onboard a new organization to the platform."
                            primary
                        />
                        <ActionLink
                            href="/super-admin/institutes"
                            icon={ArrowRight}
                            title="Manage Directory"
                            description="Audit and manage all registered institutes."
                        />
                    </div>
                </motion.div>

                {/* System Status */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 bg-slate-900 p-8 rounded-[32px] text-white overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-black tracking-tight">System Node</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="font-bold text-emerald-400 text-sm">Cluster Active</span>
                                </div>
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">v2.4.0-STABLE</span>
                            </div>

                            <div className="space-y-4">
                                <StatusItem icon={Database} label="MongoDB Core" status="Optimized" />
                                <StatusItem icon={Globe} label="API Mesh" status="Healthy" />
                            </div>
                        </div>
                    </div>

                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px]" />
                </motion.div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, trend }) {
    const colorClasses = {
        blue: "bg-blue-600 shadow-blue-600/20",
        emerald: "bg-emerald-600 shadow-emerald-600/20",
        amber: "bg-amber-600 shadow-amber-600/20",
    };

    return (
        <motion.div
            variants={item}
            className="group bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl", colorClasses[color])}>
                    <Icon size={28} />
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Metrics
                </div>
            </div>

            <p className="text-slate-500 font-bold text-sm tracking-wide lowercase mb-1">{title}</p>
            <div className="flex items-baseline gap-3">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h2>
                <span className="text-xs font-bold text-emerald-500">{trend}</span>
            </div>
        </motion.div>
    );
}

function ActionLink({ href, icon: Icon, title, description, primary }) {
    return (
        <Link href={href} className={cn(
            "group p-6 rounded-2xl border transition-all duration-300",
            primary
                ? "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20"
                : "bg-white border-slate-200 hover:border-blue-600 hover:bg-slate-50"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                primary ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
            )}>
                <Icon size={20} />
            </div>
            <h4 className={cn("font-black tracking-tight mb-1", primary ? "text-white" : "text-slate-900")}>
                {title}
            </h4>
            <p className={cn("text-xs leading-relaxed", primary ? "text-white/70" : "text-slate-500")}>
                {description}
            </p>
        </Link>
    );
}

function StatusItem({ icon: Icon, label, status }) {
    return (
        <div className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-3 text-white/70 font-medium">
                <Icon size={16} strokeWidth={2.5} />
                <span>{label}</span>
            </div>
            <span className="font-bold text-white/90">{status}</span>
        </div>
    );
}

// Internal utility duplicated to avoid import complexity in this specific file structure
function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
