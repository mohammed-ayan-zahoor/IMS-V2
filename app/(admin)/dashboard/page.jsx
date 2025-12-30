"use client";

import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import {
    Users,
    BookOpen,
    Layer3,
    CreditCard,
    ArrowUpRight,
    TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <Card className="hover:scale-[1.02] transition-transform cursor-default">
        <div className="flex justify-between items-start">
            <div className={cn("p-3 rounded-2xl", color)}>
                <Icon className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                <TrendingUp size={12} />
                <span>{trend}</span>
            </div>
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-foreground/50 uppercase tracking-wider">{title}</p>
            <h2 className="text-3xl font-black mt-1">{value}</h2>
        </div>
    </Card>
);

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function AdminDashboard() {
    const stats = [
        { title: "Total Students", value: "1,284", icon: Users, trend: "+12%", color: "bg-blue-500" },
        { title: "Active Courses", value: "48", icon: BookOpen, trend: "+4%", color: "bg-purple-500" },
        { title: "Batches Today", value: "12", icon: Layer3, trend: "Stable", color: "bg-amber-500" },
        { title: "Revenue (M)", value: "₹2.4M", icon: CreditCard, trend: "+18%", color: "bg-emerald-500" },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Enterprise Overview</h1>
                    <p className="text-foreground/50 mt-1">Welcome back, system performance is optimal.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white/5 border border-glass-border px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-md">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="lg:col-span-1 border-white/5">
                    <CardHeader title="Recent Admissions" subtitle="Last 5 students enrolled this week" />
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-glass-border">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-premium-blue to-premium-purple" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">Student Name {item}</p>
                                        <p className="text-[10px] text-foreground/50 uppercase">Web Development • Batch A</p>
                                    </div>
                                    <ArrowUpRight size={14} className="text-foreground/30" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1 border-white/5">
                    <CardHeader title="System Status" subtitle="Audit activity & background tasks" />
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse outline outline-4 outline-green-500/20" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Database Cluster</p>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2">
                                        <div className="bg-green-500 h-full w-[98%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-green-500">98% UP</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-premium-blue animate-pulse outline outline-4 outline-blue-500/20" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Auth Server (NextAuth)</p>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2">
                                        <div className="bg-premium-blue h-full w-[100%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-premium-blue">OPERATIONAL</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
