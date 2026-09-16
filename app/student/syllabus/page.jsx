"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
    BookOpen, 
    CheckCircle2, 
    Clock, 
    ChevronDown, 
    ChevronUp, 
    LayoutGrid, 
    Search, 
    TrendingUp, 
    Layers, 
    ExternalLink,
    Check
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentSyllabusPage() {
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
    const [expandedSubject, setExpandedSubject] = useState(null);

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        try {
            const res = await fetch("/api/v1/student/syllabus");
            if (res.ok) {
                const data = await res.json();
                const progList = data.progress || [];
                setProgress(progList);
                // Expand first subject by default for immediate preview
                if (progList.length > 0) {
                    setExpandedSubject(progList[0].subjectId);
                }
            }
        } catch (error) {
            console.error("Fetch progress error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate overall statistics
    const stats = useMemo(() => {
        if (progress.length === 0) {
            return { avgProgress: 0, totalChapters: 0, completedChapters: 0, totalTopics: 0, completedTopics: 0 };
        }
        const avgProgress = Math.round(
            progress.reduce((acc, curr) => acc + (curr.overallProgress || 0), 0) / progress.length
        );
        const totalChapters = progress.reduce((acc, curr) => acc + (curr.totalChapters || 0), 0);
        const completedChapters = progress.reduce((acc, curr) => acc + (curr.completedChapters || 0), 0);
        const totalTopics = progress.reduce((acc, curr) => acc + (curr.totalTopics || 0), 0);
        const completedTopics = progress.reduce((acc, curr) => acc + (curr.completedTopics || 0), 0);

        return { avgProgress, totalChapters, completedChapters, totalTopics, completedTopics };
    }, [progress]);

    // Unique subject filter pills
    const subjectFilters = useMemo(() => {
        return progress.map(p => ({
            id: p.subjectId,
            code: p.subjectCode,
            name: p.subjectName
        }));
    }, [progress]);

    // Filtered subjects based on filter pill and search query
    const filteredProgress = useMemo(() => {
        return progress.filter(p => {
            const matchesFilter = selectedSubjectFilter === "all" || p.subjectId === selectedSubjectFilter || p.subjectCode === selectedSubjectFilter;
            if (!matchesFilter) return false;

            if (!search.trim()) return true;
            const q = search.toLowerCase();
            const matchesSubject = p.subjectName.toLowerCase().includes(q) || p.subjectCode.toLowerCase().includes(q);
            if (matchesSubject) return true;

            // Check chapters or topics
            return (p.chapters || []).some(ch => 
                ch.title.toLowerCase().includes(q) ||
                (ch.topics || []).some(t => t.title.toLowerCase().includes(q))
            );
        });
    }, [progress, selectedSubjectFilter, search]);

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-6xl mx-auto space-y-6 safe-pb p-2 sm:p-4">
            
            {/* Header & Search Bar Strip */}
            <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E]">
                        Curriculum & Syllabus
                    </h1>
                    <p className="text-xs sm:text-sm text-[#8D8A9B] mt-1">
                        Track chapter progression, topic completions, and academic milestones across enrolled subjects.
                    </p>
                </div>

                <div className="relative w-full md:w-72 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D8A9B]" size={16} />
                    <input
                        type="text"
                        placeholder="Search subjects or topics..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-[#E9E8F0] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#1E1B2E] placeholder:text-[#8D8A9B] focus:outline-none focus:border-[#6E5AE0] transition-colors"
                    />
                </div>
            </div>

            {/* Quick Metrics Strip (Adtech: 3 White Cards with Soft-Square Tinted Icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Overall Clearance */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[10px] bg-[#EDE8FB] text-[#6E5AE0] flex items-center justify-center shrink-0">
                        <TrendingUp size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                            Overall Clearance
                        </p>
                        <p className="text-2xl font-bold text-[#1E1B2E] mt-0.5">
                            {stats.avgProgress}%
                        </p>
                        <p className="text-[11px] text-[#8D8A9B] truncate">
                            Across {progress.length} enrolled subjects
                        </p>
                    </div>
                </div>

                {/* 2. Active Subjects */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[10px] bg-[#E8F8F0] text-[#33C481] flex items-center justify-center shrink-0">
                        <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                            Active Subjects
                        </p>
                        <p className="text-2xl font-bold text-[#1E1B2E] mt-0.5">
                            {progress.length}
                        </p>
                        <p className="text-[11px] text-[#8D8A9B] truncate">
                            {progress[0]?.batchName ? `${progress[0].batchName} curriculum` : "Enrolled Course"}
                        </p>
                    </div>
                </div>

                {/* 3. Chapters Mastered */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[10px] bg-[#FFF6E9] text-[#FF9F43] flex items-center justify-center shrink-0">
                        <Layers size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                            Chapters Cleared
                        </p>
                        <p className="text-2xl font-bold text-[#1E1B2E] mt-0.5">
                            {stats.completedChapters} <span className="text-sm font-normal text-[#8D8A9B]">/ {stats.totalChapters}</span>
                        </p>
                        <p className="text-[11px] text-[#8D8A9B] truncate">
                            {stats.completedTopics} of {stats.totalTopics} topics completed
                        </p>
                    </div>
                </div>
            </div>

            {/* Subject Filter Tabs Strip */}
            {subjectFilters.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setSelectedSubjectFilter("all")}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                            selectedSubjectFilter === "all"
                                ? "bg-[#2C2A46] text-white shadow-sm"
                                : "bg-white border border-[#E9E8F0] text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B]"
                        )}
                    >
                        All Subjects ({progress.length})
                    </button>
                    {subjectFilters.map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setSelectedSubjectFilter(sub.id)}
                            className={cn(
                                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                selectedSubjectFilter === sub.id
                                    ? "bg-[#6E5AE0] text-white shadow-sm"
                                    : "bg-white border border-[#E9E8F0] text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B]"
                            )}
                        >
                            {sub.code}
                        </button>
                    ))}
                </div>
            )}

            {/* Subjects List */}
            <div className="space-y-4">
                {filteredProgress.map((sub) => {
                    const isExpanded = expandedSubject === sub.subjectId;
                    const completionPct = Math.round(sub.overallProgress || 0);

                    return (
                        <div
                            key={sub.subjectId}
                            className="bg-white rounded-[16px] border border-[#E9E8F0] overflow-hidden hover:border-[#6E5AE0]/30 transition-all"
                        >
                            {/* Summary Header Row */}
                            <div 
                                className="p-4 sm:p-5 cursor-pointer hover:bg-[#FAF9FC] transition-colors"
                                onClick={() => setExpandedSubject(isExpanded ? null : sub.subjectId)}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    
                                    {/* Subject Identifiers */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-11 h-11 rounded-[10px] bg-[#F1EFFB] text-[#6E5AE0] font-bold text-sm flex items-center justify-center shrink-0">
                                            {sub.subjectCode?.slice(0, 2) || "SB"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-bold text-[#1E1B2E] truncate">
                                                    {sub.subjectName}
                                                </h3>
                                                <span className="px-2.5 py-0.5 rounded-full bg-[#F7F7FA] border border-[#E9E8F0] text-[#8D8A9B] text-[11px] font-semibold">
                                                    {sub.subjectCode}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#8D8A9B] flex items-center gap-1.5 mt-0.5">
                                                <LayoutGrid size={12} className="text-[#8D8A9B]" />
                                                <span>{sub.batchName}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar & Chapter Counters */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 max-w-xl lg:ml-auto">
                                        {/* Progress Bar */}
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-[#8D8A9B] font-medium">Course Progress</span>
                                                <span className="font-bold text-[#6E5AE0]">{completionPct}%</span>
                                            </div>
                                            <div className="h-2 bg-[#F1EFFB] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#6E5AE0] rounded-full transition-all duration-500"
                                                    style={{ width: `${completionPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Metrics & Actions */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Chapters</p>
                                                <p className="text-sm font-bold text-[#1E1B2E]">
                                                    {sub.completedChapters} <span className="text-xs text-[#8D8A9B] font-normal">/ {sub.totalChapters}</span>
                                                </p>
                                            </div>

                                            {/* Link to Batch Details */}
                                            <Link
                                                href={`/student/batches/${sub.batchId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E] hover:bg-[#F8F7FA] transition-colors"
                                                title="View Batch Details & Syllabus"
                                            >
                                                <span>Batch</span>
                                                <ExternalLink size={12} className="text-[#8D8A9B]" />
                                            </Link>

                                            {/* Expand/Collapse Chevron Button */}
                                            <button
                                                type="button"
                                                className="w-8 h-8 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors cursor-pointer"
                                                aria-label={isExpanded ? "Collapse subject details" : "Expand subject details"}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Detailed Chapter & Topic Breakdown (Accordion) */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-t border-[#E9E8F0] bg-[#FAF9FC] p-4 sm:p-5"
                                    >
                                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                            <div className="text-xs font-bold uppercase tracking-wider text-[#8D8A9B]">
                                                Curriculum Breakdown • {sub.chapters?.length || 0} Chapters
                                            </div>
                                            <Link
                                                href={`/student/batches/${sub.batchId}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E5AE0] hover:underline"
                                            >
                                                <span>Open Full Batch Syllabus View</span>
                                                <ExternalLink size={12} />
                                            </Link>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            {(sub.chapters || []).map((chapter, cIdx) => (
                                                <div 
                                                    key={chapter.id || cIdx}
                                                    className={cn(
                                                        "p-4 rounded-[12px] border transition-all flex flex-col justify-between space-y-3",
                                                        chapter.isCompleted 
                                                            ? "bg-white border-emerald-200/80 shadow-none" 
                                                            : "bg-white border-[#E9E8F0] shadow-none"
                                                    )}
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                                                                Chapter {cIdx + 1}
                                                            </span>
                                                            {chapter.isCompleted ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
                                                                    <Check size={10} /> Cleared
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-[#8D8A9B] border border-[#E9E8F0] text-[10px] font-medium">
                                                                    <Clock size={10} /> In Progress
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h4 className="text-sm font-bold text-[#1E1B2E] leading-snug">
                                                            {chapter.title}
                                                        </h4>
                                                    </div>

                                                    {/* Topics Breakdown List */}
                                                    {chapter.topics && chapter.topics.length > 0 && (
                                                        <div className="pt-2 border-t border-[#F1EFFB] space-y-1.5">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B] mb-1">
                                                                Topics ({chapter.topics.filter(t => t.isCompleted).length}/{chapter.topics.length})
                                                            </p>
                                                            <div className="space-y-1">
                                                                {chapter.topics.map((topic, tIdx) => (
                                                                    <div 
                                                                        key={topic.id || tIdx}
                                                                        className="flex items-center gap-2 text-xs"
                                                                    >
                                                                        {topic.isCompleted ? (
                                                                            <CheckCircle2 size={13} className="text-[#33C481] shrink-0" />
                                                                        ) : (
                                                                            <span className="w-3 h-3 rounded-full border border-[#8D8A9B]/40 shrink-0 inline-block" />
                                                                        )}
                                                                        <span className={cn(
                                                                            "truncate",
                                                                            topic.isCompleted ? "text-[#1E1B2E] font-medium" : "text-[#8D8A9B]"
                                                                        )}>
                                                                            {topic.title}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {chapter.isCompleted && chapter.completedAt && (
                                                        <div className="text-[10px] text-[#33C481] font-semibold pt-1 border-t border-emerald-50">
                                                            Cleared on {new Date(chapter.completedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {filteredProgress.length === 0 && !loading && (
                    <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#F7F7FA] border border-[#E9E8F0] flex items-center justify-center mx-auto text-[#8D8A9B]">
                            <BookOpen size={22} />
                        </div>
                        <h3 className="text-base font-bold text-[#1E1B2E]">No subjects matched</h3>
                        <p className="text-xs text-[#8D8A9B] max-w-sm mx-auto">
                            No enrolled subjects match your current filter or search criteria.
                        </p>
                        {(search || selectedSubjectFilter !== "all") && (
                            <button
                                onClick={() => { setSearch(""); setSelectedSubjectFilter("all"); }}
                                className="px-4 py-2 rounded-full bg-[#2C2A46] text-white text-xs font-semibold hover:bg-[#1E1B2E] transition-colors"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}

