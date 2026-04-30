"use client";

import { useState, useEffect } from "react";
import { 
    BookOpen, 
    CheckCircle2, 
    Clock, 
    ArrowRight, 
    ChevronDown, 
    ChevronUp,
    LayoutGrid,
    Search,
    Book,
    Activity,
    Target
} from "lucide-react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentSyllabusPage() {
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedSubject, setExpandedSubject] = useState(null);

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        try {
            const res = await fetch("/api/v1/student/syllabus");
            if (res.ok) {
                const data = await res.json();
                setProgress(data.progress || []);
            }
        } catch (error) {
            console.error("Fetch progress error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProgress = progress.filter(p => 
        p.subjectName.toLowerCase().includes(search.toLowerCase()) || 
        p.subjectCode.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Target className="text-premium-blue" size={32} />
                        Syllabus Tracker
                    </h1>
                    <p className="text-slate-500 font-medium">Track your academic progress across all enrolled subjects.</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Filter subjects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-premium-blue/5 focus:border-premium-blue/30 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-emerald-50 border-emerald-100/50 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/50">Overall Average</p>
                            <p className="text-2xl font-black text-emerald-900">
                                {progress.length > 0 
                                    ? Math.round(progress.reduce((acc, curr) => acc + curr.overallProgress, 0) / progress.length)
                                    : 0}%
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100/50 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-premium-blue shadow-sm border border-blue-100">
                            <Book size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700/50">Active Subjects</p>
                            <p className="text-2xl font-black text-blue-900">{progress.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100/50 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/50">Subjects In Progress</p>
                            <p className="text-2xl font-black text-amber-900">{progress.filter(p => p.overallProgress > 0 && p.overallProgress < 100).length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Subjects List */}
            <div className="grid grid-cols-1 gap-6">
                {filteredProgress.map((sub, idx) => (
                    <motion.div
                        key={sub.subjectId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="overflow-hidden border-slate-100 hover:border-premium-blue/20 transition-all shadow-sm">
                            <div 
                                className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                onClick={() => setExpandedSubject(expandedSubject === sub.subjectId ? null : sub.subjectId)}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-premium-blue/5 border border-premium-blue/10 flex items-center justify-center text-premium-blue font-black text-lg">
                                            {sub.subjectCode.slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{sub.subjectName}</h3>
                                                <Badge variant="neutral" className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                                                    {sub.subjectCode}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LayoutGrid size={12} /> {sub.batchName}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8 flex-1 max-w-2xl">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Progress</span>
                                                <span className="text-sm font-black text-premium-blue">{Math.round(sub.overallProgress)}%</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${sub.overallProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-premium-blue to-blue-400 rounded-full shadow-lg shadow-blue-500/20"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-10 min-w-[120px]">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chapters</p>
                                                <p className="text-lg font-black text-slate-900">{sub.completedChapters}/{sub.totalChapters}</p>
                                            </div>
                                            {expandedSubject === sub.subjectId ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedSubject === sub.subjectId && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-50 bg-slate-50/30"
                                    >
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {sub.chapters.map((chapter, cIdx) => (
                                                <div 
                                                    key={chapter.id}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all flex items-start gap-3",
                                                        chapter.isCompleted 
                                                            ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-900 shadow-sm shadow-emerald-500/5" 
                                                            : "bg-white border-slate-100 text-slate-400"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                                        chapter.isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                                    )}>
                                                        {chapter.isCompleted ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-tight mb-1">Chapter {cIdx + 1}</p>
                                                        <h4 className={cn(
                                                            "text-sm font-bold leading-tight",
                                                            chapter.isCompleted ? "text-emerald-900" : "text-slate-600"
                                                        )}>
                                                            {chapter.title}
                                                        </h4>
                                                        {chapter.isCompleted && (
                                                            <p className="text-[9px] font-bold text-emerald-600/60 mt-2 uppercase tracking-tighter">
                                                                Completed on {new Date(chapter.completedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>
                ))}

                {filteredProgress.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">No subjects found</h3>
                        <p className="text-slate-500 font-medium">Try searching with a different term or check your batch enrollment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
