"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Trash2, Edit, Eye, Archive, Upload, FileJson, Download, Copy, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
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

export default function QuestionBankPage() {
    const toast = useToast();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(20);

    // Dropdown Data
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);

    const [filters, setFilters] = useState({
        course: "",
        batch: "",
        type: "",
        search: ""
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
    }, [filters]);

    useEffect(() => {
        fetchQuestions();
    }, [filters, currentPage, pageLimit]);

    useEffect(() => {
        if (filters.course) {
            const courseBatches = batches.filter(b =>
                String(b.course?._id || b.course) === String(filters.course)
            );
            setFilteredBatches(courseBatches);
        } else {
            setFilteredBatches([]);
        }
    }, [filters.course, batches]);


    const fetchDropdowns = async () => {
        try {
            const [cRes, bRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);
            const cData = await cRes.json();
            const bData = await bRes.json();
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
        } catch (error) {
            console.error("Failed to fetch dropdowns", error);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                ...filters,
                page: String(currentPage),
                limit: String(pageLimit)
            });
            const res = await fetch(`/api/v1/questions?${query}`);
            const data = await res.json();
            setQuestions(data.questions || []);
            if (data.pagination) setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        // Reset batch if course changes
        if (name === 'course') {
            setFilters(prev => ({ ...prev, course: value, batch: "" }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const courseOptions = [{ label: "All Courses", value: "" }, ...courses.map(c => ({ label: c.name, value: c._id }))];
    const batchOptions = [{ label: "All Batches", value: "" }, ...filteredBatches.map(b => ({ label: b.name, value: b._id }))];
    const typeOptions = [
        { label: "All Types", value: "" },
        { label: "MCQ", value: "mcq" },
        { label: "True / False", value: "true_false" },
        { label: "Short Answer", value: "short_answer" },
        { label: "Essay", value: "essay" }
    ];

    const confirm = useConfirm();

    const handleDelete = async (id) => {
        if (!await confirm({
            title: "Delete Question",
            message: "Are you sure you want to delete this question?",
            type: "danger"
        })) return;

        try {
            const res = await fetch(`/api/v1/questions/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Question deleted successfully");
            fetchQuestions(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete question");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Question Bank</h1>
                    <p className="text-slate-500 mt-1">Manage all examination questions from a central repository.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowBulkImport(true)}
                        className="font-bold flex items-center gap-2"
                    >
                        <Upload size={18} />
                        Bulk Import
                    </Button>
                    <Link href="/admin/question-bank/create">
                        <Button className="font-bold flex items-center gap-2">
                            <Plus size={18} />
                            Add Question
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Bulk Import Tip Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <FileJson size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">Bulk Import via JSON</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Upload a <code className="bg-white px-1.5 py-0.5 rounded text-blue-600 font-mono text-[10px]">.json</code> file with your questions to import up to 500 at once.
                            Supports MCQ, True/False, Short Answer &amp; Essay types.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setShowTemplate(!showTemplate)}
                            className="px-4 py-2 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                        >
                            <Eye size={14} />
                            {showTemplate ? "Hide Template" : "View Template"}
                            <ChevronDown size={12} className={`transition-transform ${showTemplate ? "rotate-180" : ""}`} />
                        </button>
                        <Button
                            variant="outline"
                            onClick={() => setShowBulkImport(true)}
                            className="text-xs font-bold flex items-center gap-1.5"
                        >
                            <Upload size={14} />
                            Import
                        </Button>
                    </div>
                </div>

                {/* Collapsible Template View */}
                {showTemplate && (
                    <div className="border-t border-blue-100 bg-white p-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">JSON Template Format</p>
                            <button
                                onClick={() => {
                                    const template = JSON.stringify([
                                        { text: "What is the capital of France?", type: "mcq", difficulty: "easy", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: 2, marks: 1, explanation: "Paris is the capital of France.", tags: ["geography"] },
                                        { text: "The Earth revolves around the Sun.", type: "true_false", difficulty: "easy", correctAnswer: "true", marks: 1 },
                                        { text: "Explain the process of photosynthesis.", type: "short_answer", difficulty: "medium", correctAnswer: "Photosynthesis is the process by which green plants convert sunlight, water, and CO2 into glucose and oxygen.", marks: 3, tags: ["biology"] }
                                    ], null, 2);
                                    navigator.clipboard.writeText(template);
                                    toast.success("Template copied to clipboard!");
                                }}
                                className="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <Copy size={12} />
                                Copy Template
                            </button>
                        </div>
                        <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto text-slate-600 leading-relaxed font-mono max-h-[300px] overflow-y-auto">
{`[
  {
    "text": "What is the capital of France?",
    "type": "mcq",              // mcq | true_false | short_answer | essay
    "difficulty": "easy",        // easy | medium | hard
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": 2,          // Index of correct option (0-based)
    "marks": 1,
    "explanation": "Paris is the capital of France.",
    "tags": ["geography", "europe"]
  },
  {
    "text": "The Earth revolves around the Sun.",
    "type": "true_false",
    "difficulty": "easy",
    "correctAnswer": "true",     // "true" or "false"
    "marks": 1
  },
  {
    "text": "Explain the process of photosynthesis.",
    "type": "short_answer",
    "difficulty": "medium",
    "correctAnswer": "Plants convert sunlight, water, and CO2 into glucose and oxygen.",
    "marks": 3,
    "tags": ["biology", "plants"]
  }
]`}
                        </pre>
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span><span className="text-slate-600">type:</span> mcq | true_false | short_answer | essay</span>
                            <span><span className="text-slate-600">difficulty:</span> easy | medium | hard</span>
                            <span><span className="text-slate-600">correctAnswer:</span> index for MCQ, &quot;true&quot;/&quot;false&quot; for T/F, text for others</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters Section */}
            <Card className="overflow-visible">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <Select
                            label="Course"
                            name="course"
                            value={filters.course}
                            onChange={(val) => handleFilterChange({ target: { name: 'course', value: val } })}
                            options={courseOptions}
                            placeholder="All Courses"
                        />
                    </div>
                    <div>
                        <Select
                            label="Batch"
                            name="batch"
                            value={filters.batch}
                            onChange={(val) => handleFilterChange({ target: { name: 'batch', value: val } })}
                            options={batchOptions}
                            placeholder="All Batches"
                            disabled={!filters.course}
                        />
                    </div>
                    <div>
                        <Select
                            label="Type"
                            name="type"
                            value={filters.type}
                            onChange={(val) => handleFilterChange({ target: { name: 'type', value: val } })}
                            options={typeOptions}
                            placeholder="All Types"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Search</label>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input 
                                placeholder="Search questions..." 
                                className="pl-9 h-10" 
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Questions Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 font-bold">Question Details</th>
                                <th className="px-6 py-3 font-bold">Course / Batch</th>
                                <th className="px-6 py-3 font-bold">Type</th>
                                <th className="px-6 py-3 font-bold">Marks</th>
                                <th className="px-6 py-3 font-bold">Created By</th>
                                <th className="px-6 py-3 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        <LoadingSpinner />
                                    </td>
                                </tr>
                            ) : questions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        No questions found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                questions.map((q) => (
                                    <tr key={q._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 max-w-md">
                                            <div className="font-medium text-slate-900 line-clamp-2">
                                                {stripHtml(q.text)}
                                            </div>
                                            {/* We can strip HTML tags for preview or just trust text is simple */}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{q.course?.name || "N/A"}</div>
                                            <div className="text-xs text-slate-500">{q.batch?.name || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={q.type === 'mcq' ? 'default' : 'secondary'}>
                                                {q.type.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {q.marks}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {q.createdBy?.fullName || "Unknown"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/question-bank/${q._id}/edit`}>
                                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                                        <Edit size={16} />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(q._id)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            <span className="font-bold text-slate-700">
                                {((pagination.page - 1) * pagination.limit) + 1}
                            </span>
                            {' '}-{' '}
                            <span className="font-bold text-slate-700">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>
                            {' '}of{' '}
                            <span className="font-bold text-slate-700">{pagination.total}</span>
                            {' '}questions
                        </p>
                        <select
                            value={pageLimit}
                            onChange={(e) => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                            className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-colors ${
                                            currentPage === pageNum
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(pagination.totalPages)}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                        >
                            <ChevronsRight size={16} />
                        </button>
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
