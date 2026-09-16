"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
    ChevronLeft, 
    BookOpen, 
    ChevronDown, 
    ChevronRight, 
    CheckCircle2, 
    Circle,
    Target,
    Layers,
    Clock,
    Search,
    Sparkles,
    Calendar,
    Laptop,
    Database,
    FileSpreadsheet,
    Code2,
    FlaskConical,
    GraduationCap
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

function getSubjectIcon(code = "") {
    const c = code.toUpperCase();
    if (c.includes("CF")) return Laptop;
    if (c.includes("OA")) return FileSpreadsheet;
    if (c.includes("DB")) return Database;
    if (c.includes("WD")) return Code2;
    if (c.includes("PR")) return FlaskConical;
    return BookOpen;
}

export default function StudentBatchDetailPage() {
    const { id: batchId } = useParams();

    const [batch, setBatch] = useState(null);
    const [progressList, setProgressList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState({});
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/student/batches/${batchId}`);
            if (res.ok) {
                const data = await res.json();
                setBatch(data.batch || data);
            }
        } catch (e) { console.error("fetchBatch error:", e); }
    }, [batchId]);

    const fetchProgress = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/student/syllabus-progress?batchId=${batchId}`);
            if (res.ok) {
                const data = await res.json();
                setProgressList(data.progressList || []);
            }
        } catch (e) { console.error("fetchProgress error:", e); }
    }, [batchId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchBatch(), fetchProgress()]);
            setLoading(false);
        };
        load();
    }, [fetchBatch, fetchProgress]);

    // Compute curriculum clearance metrics
    const stats = useMemo(() => {
        const totalSubjects = progressList.length;
        if (totalSubjects === 0) {
            return { avgProgress: 0, totalLeaves: 0, completedLeaves: 0, completedChapters: 0, totalChapters: 0 };
        }

        const avgProgress = Math.round(
            progressList.reduce((acc, p) => acc + (p.overallProgress || 0), 0) / totalSubjects
        );

        let totalLeaves = 0;
        let completedLeaves = 0;
        let totalChapters = 0;
        let completedChapters = 0;

        progressList.forEach(pg => {
            const syllabus = pg.subject?.syllabus || [];
            totalChapters += syllabus.length;
            const completedIds = new Set(
                (pg.completions || []).filter(c => c.isCompleted).map(c => String(c.itemId))
            );

            syllabus.forEach(ch => {
                if (completedIds.has(String(ch._id))) {
                    completedChapters++;
                }

                (ch.topics || []).forEach(tp => {
                    const subTopics = tp.subTopics || [];
                    if (subTopics.length > 0) {
                        subTopics.forEach(st => {
                            totalLeaves++;
                            if (completedIds.has(String(st._id))) completedLeaves++;
                        });
                    } else {
                        totalLeaves++;
                        if (completedIds.has(String(tp._id))) completedLeaves++;
                    }
                });
            });
        });

        return { avgProgress, totalLeaves, completedLeaves, completedChapters, totalChapters };
    }, [progressList]);

    // Filter progress items
    const filteredProgressList = useMemo(() => {
        return progressList.filter(pg => {
            const subject = pg.subject || {};
            const matchesSubject = selectedSubjectFilter === "all" || subject.code === selectedSubjectFilter || String(subject._id) === selectedSubjectFilter;
            
            if (!matchesSubject) return false;
            if (!searchQuery.trim()) return true;

            const q = searchQuery.toLowerCase();
            const subjectMatches = (subject.name || "").toLowerCase().includes(q) || (subject.code || "").toLowerCase().includes(q);
            if (subjectMatches) return true;

            // Check if any chapter or topic matches
            const syllabus = subject.syllabus || [];
            return syllabus.some(ch => 
                (ch.title || "").toLowerCase().includes(q) ||
                (ch.topics || []).some(t => 
                    (t.title || "").toLowerCase().includes(q) ||
                    (t.subTopics || []).some(st => (st.title || "").toLowerCase().includes(q))
                )
            );
        });
    }, [progressList, selectedSubjectFilter, searchQuery]);

    if (loading) return <LoadingSpinner fullPage />;
    if (!batch) return (
        <div className="p-8 max-w-md mx-auto my-12 bg-white rounded-[16px] border border-[#E9E8F0] text-center space-y-4">
            <Layers className="mx-auto text-[#8D8A9B]" size={36} />
            <h2 className="text-base font-bold text-[#1E1B2E]">Batch Not Found</h2>
            <p className="text-xs text-[#8D8A9B]">The requested batch record could not be loaded or enrollment is missing.</p>
            <Link href="/student/batches" className="inline-block px-5 py-2 rounded-full bg-[#2C2A46] text-white text-xs font-semibold hover:bg-[#1E1B2E] transition-colors">
                Back to My Batches
            </Link>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 safe-pb p-2 sm:p-4">
            {/* Adtech Action Pill Bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-[16px] border border-[#E9E8F0]">
                <Link
                    href="/student/batches"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E] hover:bg-[#F8F7FA] transition-colors"
                >
                    <ChevronLeft size={14} />
                    My Batches
                </Link>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/60 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Batch
                    </span>
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold">
                        {batch.course?.code || "DCA"}
                    </span>
                </div>
            </div>

            {/* Batch Overview Header Card */}
            <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E]">
                                {batch.name}
                            </h1>
                            <span className="px-3 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold">
                                {batch.course?.name || "Diploma in Computer Applications"}
                            </span>
                        </div>
                        <div className="text-xs text-[#8D8A9B] mt-2 flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar size={13} className="text-[#8D8A9B]" />
                                Academic Session: 2025–26
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock size={13} className="text-[#8D8A9B]" />
                                Mon–Sat • 09:00 AM – 02:00 PM
                            </span>
                            {batch.instructor && (
                                <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <GraduationCap size={13} className="text-[#8D8A9B]" />
                                        Faculty: {batch.instructor.profile?.firstName} {batch.instructor.profile?.lastName}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                        <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Overall Clearance</div>
                            <div className="text-xl font-bold text-[#6E5AE0]">{stats.avgProgress}%</div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#EDE8FB] flex items-center justify-center text-[#6E5AE0] font-bold text-sm border border-[#6E5AE0]/20">
                            <Target size={20} />
                        </div>
                    </div>
                </div>

                {/* Progress Clearance Bar */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-[#8D8A9B]">
                        <span>Syllabus Completion Pace</span>
                        <span className="text-[#1E1B2E]">{stats.completedLeaves} of {stats.totalLeaves} Subtopics Completed</span>
                    </div>
                    <div className="h-2 w-full bg-[#F1EFFB] rounded-full overflow-hidden border border-[#E9E8F0]">
                        <div 
                            className="h-full bg-[#6E5AE0] rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${stats.avgProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Adtech 4-Metric Overview Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Curriculum</span>
                        <div className="w-7 h-7 rounded-full bg-[#EDE8FB] flex items-center justify-center text-[#6E5AE0]">
                            <Target size={14} />
                        </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-[#1E1B2E]">{stats.avgProgress}%</div>
                    <div className="text-[11px] font-medium text-[#6E5AE0]">Cleared Overall</div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Subjects</span>
                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <BookOpen size={14} />
                        </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-[#1E1B2E]">{progressList.length} Subjects</div>
                    <div className="text-[11px] font-medium text-emerald-600">Active Curriculum</div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Chapters</span>
                        <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <CheckCircle2 size={14} />
                        </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-[#1E1B2E]">{stats.completedChapters} / {stats.totalChapters}</div>
                    <div className="text-[11px] font-medium text-amber-600">Concluded Units</div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Standing</span>
                        <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-[#F4586A]">
                            <Sparkles size={14} />
                        </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-[#1E1B2E]">On Track</div>
                    <div className="text-[11px] font-medium text-emerald-600">Good Standing</div>
                </div>
            </div>

            {/* Filter Pills & Search Control Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-[16px] border border-[#E9E8F0]">
                {/* Subject Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                    <button
                        onClick={() => setSelectedSubjectFilter("all")}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            selectedSubjectFilter === "all"
                                ? "bg-[#2C2A46] text-white"
                                : "bg-[#F8F7FA] text-[#8D8A9B] hover:text-[#1E1B2E]"
                        }`}
                    >
                        All Subjects ({progressList.length})
                    </button>
                    {progressList.map(pg => {
                        const code = pg.subject?.code || "SUB";
                        const isSelected = selectedSubjectFilter === code || selectedSubjectFilter === String(pg.subject?._id);
                        return (
                            <button
                                key={pg._id}
                                onClick={() => setSelectedSubjectFilter(code)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    isSelected
                                        ? "bg-[#2C2A46] text-white"
                                        : "bg-[#F8F7FA] text-[#8D8A9B] hover:text-[#1E1B2E]"
                                }`}
                            >
                                {code}
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D8A9B]" size={14} />
                    <input
                        type="text"
                        placeholder="Search topics or chapters..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 text-xs bg-[#F8F7FA] border border-[#E9E8F0] rounded-full text-[#1E1B2E] placeholder-[#8D8A9B] focus:outline-none focus:border-[#6E5AE0]"
                    />
                </div>
            </div>

            {/* Syllabus Subjects List */}
            <div className="space-y-4">
                {filteredProgressList.length === 0 && (
                    <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-12 text-center space-y-3">
                        <BookOpen size={36} className="mx-auto text-[#8D8A9B]" />
                        <h3 className="text-sm font-bold text-[#1E1B2E]">No Syllabus Units Found</h3>
                        <p className="text-xs text-[#8D8A9B]">No topics match your current filter or search criteria.</p>
                        <button
                            onClick={() => { setSelectedSubjectFilter("all"); setSearchQuery(""); }}
                            className="px-4 py-1.5 bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold rounded-full hover:bg-[#e0d8fa] transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}

                {filteredProgressList.map(pg => {
                    const subject = pg.subject || {};
                    const syllabus = subject.syllabus || [];
                    const completedIds = new Set(
                        (pg.completions || []).filter(c => c.isCompleted).map(c => String(c.itemId))
                    );
                    const IconComp = getSubjectIcon(subject.code);

                    return (
                        <div key={pg._id} className="bg-white rounded-[16px] border border-[#E9E8F0] overflow-hidden">
                            {/* Subject Header Row */}
                            <div className="p-4 sm:p-5 border-b border-[#E9E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-[12px] bg-[#EDE8FB] text-[#6E5AE0] flex items-center justify-center shrink-0 border border-[#6E5AE0]/15">
                                        <IconComp size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm sm:text-base font-bold text-[#1E1B2E]">
                                                {subject.name}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full bg-[#F8F7FA] border border-[#E9E8F0] text-[10px] font-mono font-bold text-[#6E5AE0]">
                                                {subject.code}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-50 text-[10px] font-semibold text-[#8D8A9B]">
                                                {subject.subjectType || "THEORY"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#8D8A9B] mt-0.5">
                                            {syllabus.length} Chapters • {syllabus.reduce((acc, ch) => acc + (ch.topics?.length || 0), 0)} Topics
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                    {/* Subject Progress Bar */}
                                    <div className="w-32 sm:w-40 text-right space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="text-[#8D8A9B]">Cleared</span>
                                            <span className="text-[#6E5AE0]">{pg.overallProgress || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#F1EFFB] rounded-full overflow-hidden border border-[#E9E8F0]">
                                            <div 
                                                className="h-full bg-[#6E5AE0] rounded-full transition-all duration-300"
                                                style={{ width: `${pg.overallProgress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EDE8FB] text-[#6E5AE0]">
                                        {pg.overallProgress >= 100 ? "Completed" : `${pg.overallProgress || 0}%`}
                                    </span>
                                </div>
                            </div>

                            {/* Chapters Accordion */}
                            <div className="divide-y divide-[#E9E8F0]">
                                {syllabus.map((ch, ci) => {
                                    const chKey = `${pg._id}-${ch._id}`;
                                    const isOpen = expandedChapters[chKey] !== false; // open by default
                                    const chDone = completedIds.has(String(ch._id));

                                    return (
                                        <div key={ch._id} className="bg-white">
                                            {/* Chapter Header */}
                                            <button
                                                onClick={() => setExpandedChapters(p => ({ ...p, [chKey]: !isOpen }))}
                                                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#F8F7FA] transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="text-[#8D8A9B] shrink-0">
                                                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </div>
                                                    <span className="font-mono text-xs font-bold text-[#8D8A9B] shrink-0">
                                                        Ch {ci + 1}
                                                    </span>
                                                    <span className={`text-xs sm:text-sm font-semibold truncate ${chDone ? 'text-[#8D8A9B] line-through' : 'text-[#1E1B2E]'}`}>
                                                        {ch.title}
                                                    </span>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-2">
                                                    {chDone ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                                                            <CheckCircle2 size={12} />
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-[#F8F7FA] text-[#8D8A9B] text-[10px] font-semibold">
                                                            {ch.topics?.length || 0} topics
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Topics List */}
                                            {isOpen && (
                                                <div className="bg-[#FAF9FC] px-4 sm:px-6 py-2 divide-y divide-[#E9E8F0]/60">
                                                    {(ch.topics || []).map((tp, ti) => {
                                                        const tpDone = completedIds.has(String(tp._id));
                                                        return (
                                                            <div key={tp._id} className="py-2.5 space-y-1.5">
                                                                <div className="flex items-start gap-2.5">
                                                                    <div className="mt-0.5 shrink-0">
                                                                        {tpDone ? (
                                                                            <CheckCircle2 size={14} className="text-[#33C481]" />
                                                                        ) : (
                                                                            <Circle size={14} className="text-[#8D8A9B]/40" />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`text-xs font-semibold ${tpDone ? 'text-[#8D8A9B]' : 'text-[#1E1B2E]'}`}>
                                                                                {ci + 1}.{ti + 1} {tp.title}
                                                                            </span>
                                                                            {tpDone && (
                                                                                <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                                                                    Verified
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Subtopics Chips */}
                                                                        {(tp.subTopics || []).length > 0 && (
                                                                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                                                                {tp.subTopics.map((st) => {
                                                                                    const stDone = completedIds.has(String(st._id));
                                                                                    return (
                                                                                        <span
                                                                                            key={st._id}
                                                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                                                                                stDone
                                                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                                                                                    : 'bg-white text-[#8D8A9B] border border-[#E9E8F0]'
                                                                                            }`}
                                                                                        >
                                                                                            {stDone && <CheckCircle2 size={9} />}
                                                                                            {st.title}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
