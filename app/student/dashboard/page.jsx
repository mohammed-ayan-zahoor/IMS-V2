"use client";

import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import {
    BookOpen,
    Calendar,
    Trophy,
    Clock,
    ArrowRight,
    Download,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const QuickStat = ({ title, value, label, icon: Icon, softColor }) => (
    <Card className={cn("flex flex-col justify-between transition-all cursor-default border-transparent shadow-sm", softColor)}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-900 bg-white/60 px-2.5 py-1 rounded-full border border-white/40 uppercase tracking-tighter">
                <span>{label}</span>
            </div>
            <div className="text-slate-900/40 p-1">
                <Icon size={18} />
            </div>
        </div>
        <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
            <p className="text-[11px] font-bold text-slate-900/50 uppercase tracking-widest mt-1">{title}</p>
        </div>
    </Card>
);

export default function StudentDashboard() {
    const stats = [
        { title: "Attendance", value: "92%", label: "Presence", icon: CheckCircle2, softColor: "bg-soft-emerald" },
        { title: "Exams Taken", value: "08", label: "Completed", icon: Trophy, softColor: "bg-soft-purple" },
        { title: "Study Hours", value: "124", label: "This Month", icon: Clock, softColor: "bg-soft-blue" },
        { title: "Resources", value: "32", label: "Downloaded", icon: BookOpen, softColor: "bg-soft-yellow" },
    ];

    const upcomingExams = [
        { title: "Advanced React Patterns", date: "Jan 05, 2026", time: "10:00 AM", marks: 100 },
        { title: "System Design 101", date: "Jan 12, 2026", time: "02:00 PM", marks: 50 },
    ];

    const recentMaterials = [
        { title: "Introduction to Next.js 14", type: "PDF", date: "Today" },
        { title: "Authentication Flow Diagram", type: "IMAGE", date: "Yesterday" },
        { title: "Backend Architecture Guide", type: "DOCX", date: "Dec 27" },
    ];

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 text-center md:text-left">Academic Overview</h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-center md:text-left">Keep pushing your boundaries, John.</p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm">Download Report</Button>
                    <Button size="sm" className="flex items-center gap-2">
                        <span>Join Class</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <QuickStat {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Exams Section */}
                <Card className="lg:col-span-2 border-border shadow-sm">
                    <CardHeader
                        title="Upcoming Examinations"
                        subtitle="Marks will be auto-calculated upon submission"
                    />
                    <CardContent className="space-y-4">
                        {upcomingExams.map((exam) => (
                            <div key={exam.title} className="flex items-center gap-6 p-4 rounded-xl bg-soft-blue/20 border border-blue-100/30 group hover:border-premium-blue transition-all">
                                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white border border-blue-100 text-premium-blue shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{exam.date.split(' ')[0]}</span>
                                    <span className="text-lg font-black">{exam.date.split(' ')[1].replace(',', '')}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900">{exam.title}</h4>
                                    <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {exam.time}</span>
                                        <span className="flex items-center gap-1"><Trophy size={12} /> {exam.marks} Marks</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                                    <ArrowRight size={18} />
                                </Button>
                            </div>
                        ))}
                        <button className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-premium-blue transition-colors">
                            View All Registered Exams
                        </button>
                    </CardContent>
                </Card>

                {/* Materials Section */}
                <div className="space-y-8">
                    <Card className="border-border shadow-sm border-t-4 border-t-amber-500">
                        <CardHeader title="Latest Resources" />
                        <CardContent className="space-y-4">
                            {recentMaterials.map((file) => (
                                <div key={file.title} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                                            <BookOpen size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{file.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{file.type} • {file.date}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Download size={14} />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 p-0 overflow-hidden relative group rounded-xl border-none shadow-md">
                        <div className="p-6 relative z-10 text-white">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-amber-300">
                                <AlertCircle size={14} />
                                <span>Notice Board</span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-slate-100 opacity-90">The main laboratory will be closed for maintenance tomorrow between 09:00 - 14:00.</p>
                            <button className="mt-5 text-[10px] font-bold hover:underline uppercase tracking-widest text-white/60 hover:text-white transition-colors">Read full circular →</button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
