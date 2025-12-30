"use client";

import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import {
    Users,
    BookOpen,
    Layers3,
    CreditCard,
    ArrowUpRight,
    TrendingUp,
    Trophy
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    const stats = [
        { title: "Students", value: "124,684", icon: Users, trend: "+12%", softColor: "bg-soft-purple" },
        { title: "Teachers", value: "12,379", icon: BookOpen, trend: "-5%", softColor: "bg-soft-yellow" },
        { title: "Staffs", value: "29,300", icon: Layers3, trend: "-2%", softColor: "bg-soft-blue" },
        { title: "Awards", value: "95,800", icon: Trophy, trend: "+8%", softColor: "bg-soft-emerald" },
    ];

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Enterprise Overview</h1>
                    <p className="text-slate-500 mt-1 font-medium">System performance metrics and admission trends.</p>
                </div>
                <div className="hidden sm:block">
                    <div className="bg-slate-50 border border-border px-4 py-2 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                        subtitle="Detailed log of the latest 5 student enrollments"
                    />
                    <CardContent>
                        <div className="divide-y divide-slate-100">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-lg bg-soft-blue flex items-center justify-center text-premium-blue group-hover:bg-premium-blue group-hover:text-white transition-colors border border-blue-100/50">
                                        <Users size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900">Student Name {item}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Web Development • Batch A</p>
                                    </div>
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-premium-blue transition-colors" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader
                        title="System Status"
                        subtitle="Real-time infrastructure health and tasks"
                    />
                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Database Cluster</p>
                                        <p className="text-[10px] font-black text-emerald-600/70">98% CAPACITY</p>
                                    </div>
                                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                                        <div className="bg-emerald-400 h-full w-[98%] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.2)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-premium-blue/60" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Auth Gateway</p>
                                        <p className="text-[10px] font-black text-premium-blue/70">OPERATIONAL</p>
                                    </div>
                                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                                        <div className="bg-premium-blue/40 h-full w-[100%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.1)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
