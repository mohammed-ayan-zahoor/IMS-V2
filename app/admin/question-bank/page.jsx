"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Edit, Upload, FileJson, Download, Copy, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import BulkImportModal from "@/components/admin/questions/BulkImportModal";

const stripHtml = (html) => {
    if (typeof window === 'undefined') return (html ?? '').replace(/<[^>]+>/g, '');
    const div = document.createElement("div");
    div.innerHTML = html ?? '';
    return div.textContent || div.innerText || "";
};

const DIFFICULTY_COLORS = { easy: "text-emerald-600", medium: "text-amber-600", hard: "text-red-600" };

const TYPE_LABELS = {
    mcq: "MCQ", multi_correct_mcq: "Multi-Correct", true_false: "True / False",
    fill_in_blank: "Fill Blank", short_answer: "Short Answer",
    essay: "Essay", numerical: "Numerical", match_the_following: "Match"
};

export default function QuestionBankPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [questions, setQuestions] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(20);

    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);
    const [chapterOptions, setChapterOptions] = useState([]);

    const [filters, setFilters] = useState({
        course: "", batch: "", subject: "", chapter: "",
        difficulty: "", type: "", status: "", search: ""
    });

    useEffect(() => { fetchDropdowns(); }, []);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedQuestions([]);
    }, [filters]);

    useEffect(() => { fetchQuestions(); }, [filters, currentPage, pageLimit]);

    // Cascade: course → batches
    useEffect(() => {
        if (filters.course) {
            setFilteredBatches(batches.filter(b => String(b.course?._id || b.course) === String(filters.course)));
        } else {
            setFilteredBatches([]);
        }
    }, [filters.course, batches]);

    // Cascade: course+subject → chapters
    useEffect(() => {
        if (!filters.course) { setChapterOptions([]); return; }
        const params = new URLSearchParams({ field: 'chapter', course: filters.course });
        if (filters.subject) params.set('subject', filters.subject);
        fetch(`/api/v1/questions/distinct?${params}`)
            .then(r => r.json())
            .then(d => setChapterOptions(d.values || []))
            .catch(() => setChapterOptions([]));
    }, [filters.course, filters.subject]);

    const fetchDropdowns = async () => {
        try {
            const [cRes, bRes] = await Promise.all([fetch("/api/v1/courses"), fetch("/api/v1/batches")]);
            const cData = await cRes.json();
            const bData = await bRes.json();
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
        } catch (e) { console.error("Failed to fetch dropdowns", e); }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({ ...filters, page: String(currentPage), limit: String(pageLimit) });
            // Remove empty params
            for (const [k, v] of [...query.entries()]) { if (!v) query.delete(k); }
            const res = await fetch(`/api/v1/questions?${query}`);
            const data = await res.json();
            setQuestions(data.questions || []);
            if (data.pagination) setPagination(data.pagination);
        } catch (e) { console.error("Failed to fetch questions", e); }
        finally { setLoading(false); }
    };

    const handleFilterChange = useCallback((name, value) => {
        setFilters(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'course') { next.batch = ""; next.chapter = ""; }
            if (name === 'subject') { next.chapter = ""; }
            return next;
        });
    }, []);

    const handleDelete = async (id) => {
        if (!await confirm({ title: "Delete Question", message: "Are you sure you want to delete this question?", type: "danger" })) return;
        try {
            const res = await fetch(`/api/v1/questions/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Question deleted");
            fetchQuestions();
        } catch { toast.error("Failed to delete question"); }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const next = [...selectedQuestions];
            questions.forEach(q => { if (!next.some(s => s._id === q._id)) next.push(q); });
            setSelectedQuestions(next);
        } else {
            const ids = questions.map(q => q._id);
            setSelectedQuestions(selectedQuestions.filter(s => !ids.includes(s._id)));
        }
    };

    const handleSelectQuestion = (q) => {
        setSelectedQuestions(prev =>
            prev.some(s => s._id === q._id) ? prev.filter(s => s._id !== q._id) : [...prev, q]
        );
    };

    const handleExportSelected = () => {
        if (!selectedQuestions.length) return;
        const data = selectedQuestions.map(q => ({
            text: stripHtml(q.text || ""), type: q.type, difficulty: q.difficulty,
            marks: q.marks, chapter: q.chapter, topic: q.topic, syllabus: q.syllabus,
            ...(q.type === 'mcq' ? { options: q.options, correctAnswer: q.correctAnswer } : {}),
            ...(q.explanation ? { explanation: q.explanation } : {}),
            ...(q.tags?.length ? { tags: q.tags } : {})
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `questions_export_${Date.now()}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast.success(`Exported ${selectedQuestions.length} questions`);
        setSelectedQuestions([]);
    };

    // Option arrays
    const courseOptions = [{ label: "All Courses", value: "" }, ...courses.map(c => ({ label: c.name, value: c._id }))];
    const batchOptions  = [{ label: "All Batches", value: "" }, ...filteredBatches.map(b => ({ label: b.name, value: b._id }))];
    const chapterSelectOptions = [{ label: "All Chapters", value: "" }, ...chapterOptions.map(c => ({ label: c, value: c }))];
    const difficultyOptions = [
        { label: "All Difficulties", value: "" },
        { label: "Easy", value: "easy" }, { label: "Medium", value: "medium" }, { label: "Hard", value: "hard" }
    ];
    const typeOptions = [
        { label: "All Types", value: "" },
        { label: "MCQ", value: "mcq" }, { label: "Multi-Correct MCQ", value: "multi_correct_mcq" },
        { label: "True / False", value: "true_false" }, { label: "Fill in Blank", value: "fill_in_blank" },
        { label: "Short Answer", value: "short_answer" }, { label: "Essay", value: "essay" },
        { label: "Numerical", value: "numerical" }, { label: "Match the Following", value: "match_the_following" }
    ];
    const statusOptions = [
        { label: "All Status", value: "" },
        { label: "Draft", value: "draft" }, { label: "Approved", value: "approved" }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Question Bank</h1>
                    <p className="text-slate-500 mt-1">Manage all examination questions from a central repository.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedQuestions.length > 0 && (
                        <Button variant="outline" onClick={handleExportSelected} className="font-bold flex items-center gap-2 border-premium-blue text-premium-blue hover:bg-premium-blue/5">
                            <Download size={18} /> Export Selected ({selectedQuestions.length})
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowBulkImport(true)} className="font-bold flex items-center gap-2">
                        <Upload size={18} /> Bulk Import
                    </Button>
                    <Link href="/admin/question-bank/create">
                        <Button className="font-bold flex items-center gap-2">
                            <Plus size={18} /> Add Question
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Bulk Import Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-[8px] overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <FileJson size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">Bulk Import via JSON</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Upload a <code className="bg-white px-1.5 py-0.5 rounded text-blue-600 font-mono text-[10px]">.json</code> file to import up to 500 questions at once. Supports all question types including chapter, topic and model answer fields.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setShowTemplate(!showTemplate)}
                            className="px-4 py-2 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-[8px] hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                        >
                            {showTemplate ? "Hide Template" : "View Template"}
                            <ChevronDown size={12} className={`transition-transform ${showTemplate ? "rotate-180" : ""}`} />
                        </button>
                        <Button variant="outline" onClick={() => setShowBulkImport(true)} className="text-xs font-bold flex items-center gap-1.5">
                            <Upload size={14} /> Import
                        </Button>
                    </div>
                </div>
                {showTemplate && (
                    <div className="border-t border-blue-100 bg-white p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">JSON Template Format</p>
                            <button
                                onClick={() => {
                                    const t = JSON.stringify([
                                        { text: "What is Newton's 2nd Law?", type: "mcq", difficulty: "medium", chapter: "Laws of Motion", topic: "Newton's Laws", syllabus: "CBSE", options: ["F=ma", "F=mv", "F=m/a", "F=a/m"], correctAnswer: 0, marks: 1, status: "approved" },
                                        { text: "The speed of light is 3×10⁸ m/s.", type: "true_false", difficulty: "easy", chapter: "Optics", correctAnswer: "true", marks: 1 },
                                        { text: "Explain the process of photosynthesis.", type: "short_answer", difficulty: "medium", chapter: "Plant Biology", marks: 3, modelAnswer: "Green plants convert sunlight, water and CO₂ into glucose and oxygen.", rubric: "2 marks – reactants/products; 1 mark – role of chlorophyll" }
                                    ], null, 2);
                                    navigator.clipboard.writeText(t);
                                    toast.success("Template copied!");
                                }}
                                className="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-[8px] hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <Copy size={12} /> Copy Template
                            </button>
                        </div>
                        <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-[8px] p-4 overflow-x-auto text-slate-600 leading-relaxed font-mono max-h-[300px] overflow-y-auto">{`[
  {
    "text": "What is Newton's 2nd Law?",
    "type": "mcq",                   // mcq | multi_correct_mcq | true_false | fill_in_blank
                                     // short_answer | essay | numerical | match_the_following
    "difficulty": "medium",          // easy | medium | hard
    "chapter": "Laws of Motion",     // optional
    "topic": "Newton's Laws",        // optional
    "syllabus": "CBSE",             // optional
    "options": ["F=ma","F=mv","F=m/a","F=a/m"],
    "correctAnswer": 0,              // index for mcq, "[0,2]" for multi_correct, "true"/"false", number for numerical
    "marks": 1,
    "status": "approved",            // draft | approved (default: draft)
    "modelAnswer": "...",            // for short_answer / essay
    "rubric": "..."                  // marking criteria for subjective questions
  }
]`}</pre>
                    </div>
                )}
            </div>

            {/* Filters */}
            <Card className="overflow-visible">
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
                    <Select label="Course" value={filters.course} onChange={v => handleFilterChange('course', v)} options={courseOptions} placeholder="All Courses" />
                    <Select label="Batch"  value={filters.batch}  onChange={v => handleFilterChange('batch', v)}  options={batchOptions}  placeholder="All Batches" disabled={!filters.course} />
                    <Select label="Chapter" value={filters.chapter} onChange={v => handleFilterChange('chapter', v)} options={chapterSelectOptions} placeholder="All Chapters" disabled={!filters.course} />
                    <Select label="Difficulty" value={filters.difficulty} onChange={v => handleFilterChange('difficulty', v)} options={difficultyOptions} />
                    <Select label="Type"   value={filters.type}   onChange={v => handleFilterChange('type', v)}   options={typeOptions} />
                    <Select label="Status" value={filters.status} onChange={v => handleFilterChange('status', v)} options={statusOptions} />
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Search</label>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Search questions..."
                                className="pl-9 h-10"
                                value={filters.search}
                                onChange={e => handleFilterChange('search', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-premium-blue focus:ring-premium-blue"
                                        checked={questions.length > 0 && questions.every(q => selectedQuestions.some(s => s._id === q._id))}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3 font-bold">Question</th>
                                <th className="px-6 py-3 font-bold">Chapter / Topic</th>
                                <th className="px-6 py-3 font-bold">Type</th>
                                <th className="px-6 py-3 font-bold">Difficulty</th>
                                <th className="px-6 py-3 font-bold">Marks</th>
                                <th className="px-6 py-3 font-bold">Status</th>
                                <th className="px-6 py-3 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center"><LoadingSpinner /></td></tr>
                            ) : questions.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-400 text-sm">No questions found matching your filters.</td></tr>
                            ) : questions.map(q => (
                                <tr key={q._id} className={`hover:bg-slate-50/50 transition-colors ${selectedQuestions.some(s => s._id === q._id) ? "bg-premium-blue/5" : ""}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-premium-blue focus:ring-premium-blue"
                                            checked={selectedQuestions.some(s => s._id === q._id)}
                                            onChange={() => handleSelectQuestion(q)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 max-w-sm">
                                        <div className="font-medium text-slate-900 line-clamp-2">{stripHtml(q.text)}</div>
                                        {q.createdBy && (
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {q.createdBy.profile?.firstName} {q.createdBy.profile?.lastName}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {q.chapter ? (
                                            <div>
                                                <div className="font-medium text-slate-700 text-xs">{q.chapter}</div>
                                                {q.topic && <div className="text-xs text-slate-400">{q.topic}</div>}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={['short_answer','essay'].includes(q.type) ? 'secondary' : 'default'}>
                                            {TYPE_LABELS[q.type] || q.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold capitalize">
                                        <span className={DIFFICULTY_COLORS[q.difficulty] || 'text-slate-500'}>{q.difficulty}</span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{q.marks}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={q.status === 'approved' ? 'success' : 'warning'}>
                                            {q.status === 'approved' ? 'Approved' : 'Draft'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/question-bank/${q._id}/edit`}>
                                                <button className="p-2 hover:bg-slate-100 rounded-[8px] text-slate-400 hover:text-blue-600 transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(q._id)}
                                                className="p-2 hover:bg-slate-100 rounded-[8px] text-slate-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-bold text-slate-700">{((pagination.page - 1) * pagination.limit) + 1}</span>
                            {' – '}
                            <span className="font-bold text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                            {' of '}
                            <span className="font-bold text-slate-700">{pagination.total}</span> questions
                        </p>
                        <select
                            value={pageLimit}
                            onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                            className="text-xs font-bold text-slate-600 border border-slate-200 rounded-[8px] px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-[8px] hover:bg-slate-100 disabled:opacity-30 text-slate-500"><ChevronsLeft size={16} /></button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-[8px] hover:bg-slate-100 disabled:opacity-30 text-slate-500"><ChevronLeft size={16} /></button>
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let p;
                                if (pagination.totalPages <= 5) p = i + 1;
                                else if (currentPage <= 3) p = i + 1;
                                else if (currentPage >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
                                else p = currentPage - 2 + i;
                                return (
                                    <button key={p} onClick={() => setCurrentPage(p)}
                                        className={`min-w-[32px] h-8 rounded-[8px] text-xs font-bold transition-colors ${currentPage === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="p-2 rounded-[8px] hover:bg-slate-100 disabled:opacity-30 text-slate-500"><ChevronRight size={16} /></button>
                        <button onClick={() => setCurrentPage(pagination.totalPages)} disabled={currentPage === pagination.totalPages} className="p-2 rounded-[8px] hover:bg-slate-100 disabled:opacity-30 text-slate-500"><ChevronsRight size={16} /></button>
                    </div>
                </div>
            )}

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                courses={courses}
                batches={batches}
                onImportComplete={fetchQuestions}
            />
        </div>
    );
}
