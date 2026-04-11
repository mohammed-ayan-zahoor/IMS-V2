"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Badge from "@/components/ui/Badge";

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 56 }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return (
        <svg width={size} height={size}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="#3b82f6" strokeWidth="6" strokeDasharray={circ}
                strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="11" fill="#1e293b" fontWeight="700">
                {percent}%
            </text>
        </svg>
    );
}

export default function StudentBatchDetailPage() {
    const { id: batchId } = useParams();
    const router = useRouter();

    const [batch, setBatch] = useState(null);
    const [progressList, setProgressList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState({});

    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/student/batches/${batchId}`);
            if (res.ok) {
                const data = await res.json();
                setBatch(data.batch || data);
            }
        } catch (e) { console.error(e); }
    }, [batchId]);

    const fetchProgress = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/student/syllabus-progress?batchId=${batchId}`);
            if (res.ok) {
                const data = await res.json();
                setProgressList(data.progressList || []);
            }
        } catch (e) { console.error(e); }
    }, [batchId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchBatch(), fetchProgress()]);
            setLoading(false);
        };
        load();
    }, [fetchBatch, fetchProgress]);

    if (loading) return <LoadingSpinner fullPage />;
    if (!batch) return <div className="text-center py-20 text-slate-400">Batch not found.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <button onClick={() => router.push('/student/batches')} className="p-2 mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{batch.name}</h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <Badge variant="primary" className="text-[10px] font-mono">{batch.course?.name}</Badge>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Syllabus Progress</h2>
                {progressList.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white">
                        <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Syllabus progress not available yet.</p>
                    </div>
                )}
                {progressList.map(pg => {
                    const subject = pg.subject;
                    const syllabus = subject?.syllabus || [];
                    const completedIds = new Set(
                        (pg.completions || []).filter(c => c.isCompleted).map(c => String(c.itemId))
                    );

                    return (
                        <div key={pg._id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 bg-slate-50/40">
                                <ProgressRing percent={pg.overallProgress || 0} />
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800">{subject?.name}</h3>
                                    <p className="text-xs text-slate-400">{syllabus.length} chapters</p>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {syllabus.map((ch, ci) => {
                                    const chKey = `${pg._id}-${ch._id}`;
                                    const isOpen = expandedChapters[chKey] !== false;
                                    const chDone = completedIds.has(String(ch._id));

                                    return (
                                        <div key={ch._id}>
                                            <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                                                <button onClick={() => setExpandedChapters(p => ({ ...p, [chKey]: !isOpen }))} className="text-slate-300 hover:text-slate-500 shrink-0">
                                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                                <span className="shrink-0">{chDone ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="text-slate-200" />}</span>
                                                <span className={`text-sm font-semibold flex-1 ${chDone ? 'text-slate-400' : 'text-slate-800'}`}>
                                                    {ci + 1}. {ch.title}
                                                </span>
                                            </div>
                                            {isOpen && (ch.topics || []).map((tp, ti) => {
                                                const tpDone = completedIds.has(String(tp._id));
                                                return (
                                                    <div key={tp._id}>
                                                        <div className="flex items-center gap-3 pl-12 pr-5 py-2.5 hover:bg-slate-50/40 transition-colors">
                                                            <span className="shrink-0">{tpDone ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} className="text-slate-200" />}</span>
                                                            <span className={`text-xs font-medium flex-1 ${tpDone ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                {ci + 1}.{ti + 1} {tp.title}
                                                            </span>
                                                        </div>
                                                        {(tp.subTopics || []).map((st, si) => {
                                                            const stDone = completedIds.has(String(st._id));
                                                            return (
                                                                <div key={st._id} className="flex items-center gap-3 pl-20 pr-5 py-2 hover:bg-slate-50/20 transition-colors">
                                                                    <span className="shrink-0">{stDone ? <CheckCircle2 size={12} className="text-green-500" /> : <Circle size={12} className="text-slate-100" />}</span>
                                                                    <span className={`text-[11px] flex-1 ${stDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                        {ci + 1}.{ti + 1}.{si + 1} {st.title}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
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
