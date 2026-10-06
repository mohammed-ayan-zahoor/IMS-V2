"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Save,
    BookOpen, ArrowLeft, FileText, List as ListIcon, Upload, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

// ─── Helper: generate a temp client-side key for new items ───────────────────
let tmpId = 0;
const newTmp = () => `tmp_${++tmpId}`;

export default function SyllabusBuilderPage() {
    const { id: subjectId } = useParams();
    const router = useRouter();
    const toast = useToast();
    const { data: session } = useSession();
    const isCollege = session?.user?.institute?.type === 'COLLEGE';
    const unitTerm = isCollege ? "Module" : "Chapter";
    const unitTermPlural = isCollege ? "Modules" : "Chapters";
    const unitPrefix = isCollege ? "MOD." : "CH.";

    const [subject, setSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState({});
    const [importing, setImporting] = useState(false);

    // Fetch subject + syllabus
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [subRes, sylRes] = await Promise.all([
                    fetch(`/api/v1/subjects/${subjectId}`),
                    fetch(`/api/v1/subjects/${subjectId}/syllabus`)
                ]);
                const subData = await subRes.json();
                const sylData = await sylRes.json();
                setSubject(subData.subject || subData);
                const raw = sylData.syllabus || [];
                
                setChapters(raw.map(ch => ({
                    ...ch,
                    _tmpId: ch._id || newTmp(),
                    topics: (ch.topics || []).map(tp => ({
                        ...tp,
                        _tmpId: tp._id || newTmp(),
                        subTopics: (tp.subTopics || []).map(st => ({
                            ...st,
                            _tmpId: st._id || newTmp()
                        }))
                    }))
                })));
                
                if (raw.length > 0) {
                    setExpandedChapters({ [raw[0]._id || 'tmp_1']: true });
                }
            } catch (err) {
                toast.error("Failed to load syllabus");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [subjectId, toast, subjectId]);

    // ── Chapter mutations ──────────────────────────────────────────────────────
    const addChapter = () => {
        const ch = { _tmpId: newTmp(), title: "", order: chapters.length, topics: [] };
        setChapters(prev => [...prev, ch]);
        setExpandedChapters(prev => ({ ...prev, [ch._tmpId]: true }));
    };

    const updateChapterTitle = (tmpId, title) =>
        setChapters(prev => prev.map(ch => ch._tmpId === tmpId ? { ...ch, title } : ch));

    const removeChapter = (tmpId) => {
        setChapters(prev => prev.filter(ch => ch._tmpId !== tmpId));
    };

    // ── Topic mutations ───────────────────────────────────────────────────────
    const addTopic = (chTmpId) => {
        const tp = { _tmpId: newTmp(), title: "", order: 0, subTopics: [] };
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId ? { ...ch, topics: [...ch.topics, tp] } : ch
        ));
    };

    const updateTopicTitle = (chTmpId, tpTmpId, title) =>
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId
                ? { ...ch, topics: ch.topics.map(tp => tp._tmpId === tpTmpId ? { ...tp, title } : tp) }
                : ch
        ));

    const removeTopic = (chTmpId, tpTmpId) =>
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId
                ? { ...ch, topics: ch.topics.filter(tp => tp._tmpId !== tpTmpId) }
                : ch
        ));

    // ── SubTopic mutations ────────────────────────────────────────────────────
    const addSubTopic = (chTmpId, tpTmpId) => {
        const st = { _tmpId: newTmp(), title: "", order: 0 };
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId
                ? {
                    ...ch, topics: ch.topics.map(tp =>
                        tp._tmpId === tpTmpId ? { ...tp, subTopics: [...tp.subTopics, st] } : tp
                    )
                }
                : ch
        ));
    };

    const updateSubTopicTitle = (chTmpId, tpTmpId, stTmpId, title) =>
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId
                ? {
                    ...ch, topics: ch.topics.map(tp =>
                        tp._tmpId === tpTmpId
                            ? { ...tp, subTopics: tp.subTopics.map(st => st._tmpId === stTmpId ? { ...st, title } : st) }
                            : tp
                    )
                }
                : ch
        ));

    const removeSubTopic = (chTmpId, tpTmpId, stTmpId) =>
        setChapters(prev => prev.map(ch =>
            ch._tmpId === chTmpId
                ? {
                    ...ch, topics: ch.topics.map(tp =>
                        tp._tmpId === tpTmpId
                            ? { ...tp, subTopics: tp.subTopics.filter(st => st._tmpId !== stTmpId) }
                            : tp
                    )
                }
                : ch
        ));

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (chapters.length > 0 && chapters.every(ch => !ch.title?.trim())) {
            toast.error(`Please enter a title for at least one ${unitTerm.toLowerCase()}`);
            return;
        }

        try {
            setSaving(true);
            const payload = chapters.map(({ _tmpId, ...ch }) => ({
                ...ch,
                topics: (ch.topics || []).map(({ _tmpId, ...tp }) => ({
                    ...tp,
                    subTopics: (tp.subTopics || []).map(({ _tmpId, ...st }) => st)
                }))
            }));

            const res = await fetch(`/api/v1/subjects/${subjectId}/syllabus`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapters: payload })
            });

            if (res.ok) {
                const data = await res.json();
                const newSyllabus = data.syllabus || [];
                
                // Re-map with _tmpId to maintain consistency with the UI mapping logic
                setChapters(newSyllabus.map((ch, idx) => ({
                    ...ch,
                    _tmpId: ch._id || ch.id || `saved_${idx}`,
                    topics: (ch.topics || []).map((tp, tIdx) => ({
                        ...tp,
                        _tmpId: tp._id || tp.id || `saved_${idx}_${tIdx}`,
                        subTopics: (tp.subTopics || []).map((st, sIdx) => ({
                            ...st,
                            _tmpId: st._id || st.id || `saved_${idx}_${tIdx}_${sIdx}`
                        }))
                    }))
                })));

                toast.success("Syllabus updated successfully");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save syllabus");
            }
        } catch (e) {
            console.error("Save error:", e);
            toast.error("Failed to save syllabus");
        } finally {
            setSaving(false);
        }
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const res = await fetch(`/api/v1/subjects/${subjectId}/syllabus/export`);
            if (!res.ok) throw new Error("Export failed");
            const data = await res.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `syllabus_${subject?.name || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Syllabus exported successfully");
        } catch (e) {
            console.error("Export error:", e);
            toast.error("Failed to export syllabus");
        }
    };

    // ── Import ─────────────────────────────────────────────────────────────────
    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.syllabus || !Array.isArray(data.syllabus)) {
                throw new Error("Invalid file format");
            }

            const res = await fetch(`/api/v1/subjects/${subjectId}/syllabus/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    syllabus: data.syllabus,
                    mode: "replace" 
                })
            });

            if (!res.ok) throw new Error("Import failed");
            
            const result = await res.json();
            const newSyllabus = result.syllabus || [];
            
            setChapters(newSyllabus.map((ch, idx) => ({
                ...ch,
                _tmpId: ch._id || `saved_${idx}`,
                topics: (ch.topics || []).map((tp, tIdx) => ({
                    ...tp,
                    _tmpId: tp._id || `saved_${idx}_${tIdx}`,
                    subTopics: (tp.subTopics || []).map((st, sIdx) => ({
                        ...st,
                        _tmpId: st._id || `saved_${idx}_${tIdx}_${sIdx}`
                    }))
                }))
            })));

            toast.success("Syllabus imported successfully");
        } catch (err) {
            console.error("Import error:", err);
            toast.error("Failed to import syllabus. Invalid file format.");
        } finally {
            setImporting(false);
            e.target.value = "";
        }
    };

    // ── Merge ─────────────────────────────────────────────────────────────────
    const handleMerge = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.syllabus || !Array.isArray(data.syllabus)) {
                throw new Error("Invalid file format");
            }

            const res = await fetch(`/api/v1/subjects/${subjectId}/syllabus/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    syllabus: data.syllabus,
                    mode: "merge" 
                })
            });

            if (!res.ok) throw new Error("Merge failed");
            
            const result = await res.json();
            const newSyllabus = result.syllabus || [];
            
            setChapters(newSyllabus.map((ch, idx) => ({
                ...ch,
                _tmpId: ch._id || `saved_${idx}`,
                topics: (ch.topics || []).map((tp, tIdx) => ({
                    ...tp,
                    _tmpId: tp._id || `saved_${idx}_${tIdx}`,
                    subTopics: (tp.subTopics || []).map((st, sIdx) => ({
                        ...st,
                        _tmpId: st._id || `saved_${idx}_${tIdx}_${sIdx}`
                    }))
                }))
            })));

            toast.success("Syllabus merged successfully");
        } catch (err) {
            console.error("Merge error:", err);
            toast.error("Failed to merge syllabus. Invalid file format.");
        } finally {
            setImporting(false);
            e.target.value = "";
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push("/admin/subjects")} 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg active:scale-90 transition-transform cursor-pointer"
                        aria-label="Back to subjects"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Syllabus Builder</h1>
                        <p className="text-slate-500 mt-0.5 text-xs font-medium">{subject?.name} • <span className="font-mono text-slate-400">{subject?.code}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                        id="import-syllabus"
                        disabled={importing}
                    />
                    <label htmlFor="import-syllabus" className="cursor-pointer">
                        <Button variant="outline" size="sm" as="span" className="flex items-center gap-1.5 active:scale-95 transition-transform pointer-events-none">
                            <Upload size={14} />
                            <span>Import</span>
                        </Button>
                    </label>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleMerge}
                        className="hidden"
                        id="merge-syllabus"
                        disabled={importing}
                    />
                    <label htmlFor="merge-syllabus" className="cursor-pointer">
                        <Button variant="outline" size="sm" as="span" className="flex items-center gap-1.5 active:scale-95 transition-transform pointer-events-none">
                            <Upload size={14} />
                            <span>Merge</span>
                        </Button>
                    </label>
                    <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                        <Download size={14} />
                        <span>Export</span>
                    </Button>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="flex items-center gap-1.5 px-4 shadow-xs active:scale-95 transition-transform cursor-pointer">
                        <Save size={15} />
                        <span>{saving ? "Saving..." : "Save Syllabus"}</span>
                    </Button>
                </div>
            </div>

            {/* Content Builder Area */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {chapters.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 py-16 text-center rounded-xl bg-white">
                            <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
                            <h3 className="text-base font-bold text-slate-800">Empty Syllabus</h3>
                            <p className="text-slate-400 text-xs mb-5 max-w-sm mx-auto">Start by adding your first {unitTerm.toLowerCase()} to organize topics and modules.</p>
                            <Button onClick={addChapter} variant="outline" size="sm" className="mx-auto flex items-center gap-1.5 active:scale-95 transition-transform">
                                <Plus size={16} /> Add {unitTerm}
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-3.5">
                            {chapters.map((ch, chIdx) => {
                                const isExpanded = expandedChapters[ch._tmpId] !== false;
                                return (
                                    <motion.div
                                        key={ch._tmpId}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <Card className="overflow-hidden border border-slate-200/90 shadow-xs rounded-xl bg-white transition-shadow hover:shadow-sm">
                                            <div className={cn(
                                                "flex items-center gap-3 px-5 py-3.5 transition-colors cursor-pointer select-none",
                                                isExpanded ? "bg-slate-50/70 border-b border-slate-100" : "bg-white"
                                            )}
                                            onClick={() => setExpandedChapters(p => ({ ...p, [ch._tmpId]: !isExpanded }))}
                                            >
                                                <button 
                                                    type="button"
                                                    className="text-slate-400 hover:text-slate-600 active:scale-90 transition-transform p-0.5 rounded cursor-pointer"
                                                    aria-label="Toggle section"
                                                >
                                                    <motion.div
                                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                                    >
                                                        <ChevronRight size={16} />
                                                    </motion.div>
                                                </button>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-12 shrink-0 font-mono">{unitPrefix}{chIdx + 1}</span>
                                                <input
                                                    type="text"
                                                    value={ch.title}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => updateChapterTitle(ch._tmpId, e.target.value)}
                                                    placeholder={`${unitTerm} Title (e.g. Fundamental Concepts)`}
                                                    className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none placeholder:text-slate-300 focus:text-blue-700 transition-colors"
                                                />
                                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => removeChapter(ch._tmpId)} 
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/80 rounded-md active:scale-90 transition-transform cursor-pointer" 
                                                        title={`Delete ${unitTerm}`}
                                                        aria-label={`Delete ${unitTerm}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-5 py-4 space-y-3.5 bg-white">
                                                    {ch.topics?.map((tp, tpIdx) => (
                                                        <div key={tp._tmpId} className="relative pl-5 py-1 border-l-2 border-slate-100 group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within:bg-blue-600 transition-colors" />
                                                                <span className="text-[10px] font-semibold text-slate-400 w-7 shrink-0 font-mono">{chIdx + 1}.{tpIdx + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    value={tp.title}
                                                                    onChange={e => updateTopicTitle(ch._tmpId, tp._tmpId, e.target.value)}
                                                                    placeholder="Topic Title (e.g. Basic Definitions)"
                                                                    className="flex-1 text-xs sm:text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300 focus:text-slate-900"
                                                                />
                                                                <div className="flex items-center gap-1">
                                                                    <button 
                                                                        onClick={() => addSubTopic(ch._tmpId, tp._tmpId)} 
                                                                        className="px-2 py-1 text-blue-600 hover:bg-blue-50/80 rounded text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
                                                                    >
                                                                        + Subtopic
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => removeTopic(ch._tmpId, tp._tmpId)} 
                                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50/80 rounded active:scale-90 transition-transform cursor-pointer"
                                                                        title="Remove topic"
                                                                        aria-label="Remove topic"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Sub-topics list */}
                                                            {tp.subTopics?.length > 0 && (
                                                                <div className="mt-2 space-y-1 ml-5">
                                                                    {tp.subTopics.map((st) => (
                                                                        <div key={st._tmpId} className="flex items-center gap-2.5 py-0.5 group/st">
                                                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                                            <input
                                                                                type="text"
                                                                                value={st.title}
                                                                                onChange={e => updateSubTopicTitle(ch._tmpId, tp._tmpId, st._tmpId, e.target.value)}
                                                                                placeholder="Detailed item..."
                                                                                className="flex-1 text-xs text-slate-600 outline-none placeholder:text-slate-300 focus:text-slate-900"
                                                                            />
                                                                            <button 
                                                                                onClick={() => removeSubTopic(ch._tmpId, tp._tmpId, st._tmpId)} 
                                                                                className="p-1 text-slate-400 hover:text-red-500 rounded active:scale-90 transition-transform cursor-pointer"
                                                                                title="Remove subtopic"
                                                                                aria-label="Remove subtopic"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <button 
                                                        onClick={() => addTopic(ch._tmpId)} 
                                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 text-[11px] font-bold tracking-tight text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 border border-dashed border-slate-200/90 rounded-lg active:scale-98 transition-transform cursor-pointer"
                                                    >
                                                        <Plus size={13} /> Add Topic to {unitTerm} {chIdx + 1}
                                                    </button>
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })}

                            <Button 
                                onClick={addChapter} 
                                className="w-full py-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs active:scale-98 transition-transform mt-6 cursor-pointer"
                            >
                                <Plus size={16} />
                                <span className="text-xs font-bold tracking-wide">Create New {unitTerm}</span>
                            </Button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
