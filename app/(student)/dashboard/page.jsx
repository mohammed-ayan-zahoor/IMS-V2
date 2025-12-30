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

const QuickStat = ({ title, value, label, icon: Icon, color }) => (
    <Card className="flex flex-col justify-between overflow-hidden group">
        <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -mr-8 -mt-8", color)} />
        <div className="flex justify-between items-start mb-4">
            <div className={cn("p-2.5 rounded-xl", color + "/10")}>
                <Icon className={cn("text-white opacity-90", color.replace('bg-', 'text-'))} size={20} />
            </div>
            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{label}</span>
        </div>
        <div>
            <h3 className="text-3xl font-black">{value}</h3>
            <p className="text-sm font-medium text-foreground/50 mt-1">{title}</p>
        </div>
    </Card>
);

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function StudentDashboard() {
    const stats = [
        { title: "Attendance", value: "92%", label: "Presence", icon: CheckCircle2, color: "bg-emerald-500" },
        { title: "Exams Taken", value: "08", label: "Completed", icon: Trophy, color: "bg-premium-purple" },
        { title: "Study Hours", value: "124", label: "This Month", icon: Clock, color: "bg-blue-500" },
        { title: "Resources", value: "32", label: "Downloaded", icon: BookOpen, color: "bg-amber-500" },
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
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Academic Overview</h1>
                    <p className="text-foreground/50 mt-1 italic">Keep pushing your boundaries, John.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="hidden sm:flex">Download Report</Button>
                    <Button size="sm" className="flex items-center gap-2">
                        <span>Join Class</span>
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <QuickStat {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Exams Section */}
                <Card className="lg:col-span-2 border-white/5">
                    <CardHeader
                        title="Upcoming Examinations"
                        subtitle="Marks will be auto-calculated upon submission"
                    />
                    <CardContent className="space-y-4">
                        {upcomingExams.map((exam) => (
                            <div key={exam.title} className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-glass-border group hover:bg-white/[0.08] transition-all">
                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-premium-blue/10 border border-premium-blue/20 text-premium-blue">
                                    <span className="text-xs font-black uppercase tracking-tighter">{exam.date.split(' ')[0]}</span>
                                    <span className="text-xl font-black">{exam.date.split(' ')[1].replace(',', '')}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg">{exam.title}</h4>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-foreground/40 font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {exam.time}</span>
                                        <span className="flex items-center gap-1"><Trophy size={12} /> {exam.marks} Marks</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                                    <ArrowRight size={20} />
                                </Button>
                            </div>
                        ))}
                        <button className="w-full py-3 text-xs font-bold uppercase tracking-widest text-foreground/30 hover:text-premium-blue transition-colors">
                            View All Registered Exams
                        </button>
                    </CardContent>
                </Card>

                {/* Materials Section */}
                <div className="space-y-8">
                    <Card className="border-white/5 border-l-4 border-l-amber-500/50">
                        <CardHeader title="Latest Resources" />
                        <CardContent className="space-y-4">
                            {recentMaterials.map((file) => (
                                <div key={file.title} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <BookOpen size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold truncate max-w-[120px]">{file.title}</p>
                                            <p className="text-[10px] text-foreground/40 font-bold uppercase">{file.type} • {file.date}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Download size={16} />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-500 to-premium-purple p-0 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-6 relative z-10 text-white">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                <AlertCircle size={14} />
                                <span>Notice Board</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">The main laboratory will be closed for maintenance tomorrow between 09:00 - 14:00.</p>
                            <button className="mt-4 text-xs font-bold hover:underline">Read full circular →</button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
