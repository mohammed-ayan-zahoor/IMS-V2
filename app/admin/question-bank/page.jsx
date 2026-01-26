"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Trash2, Edit, Eye, Archive } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import DOMPurify from "dompurify";

export default function QuestionBankPage() {
    const { toast } = useToast();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dropdown Data
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);

    const [filters, setFilters] = useState({
        course: "",
        batch: "",
        type: ""
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [filters]);

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
            setLoading(true); // Re-enable loading on filter change
            const query = new URLSearchParams(filters);
            const res = await fetch(`/api/v1/questions?${query}`);
            const data = await res.json();
            setQuestions(data.questions || []);
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
        { label: "Descriptive", value: "descriptive" }
    ];

    const confirm = useConfirm();

    const handleDelete = async (id) => {
        if (!await confirm("Are you sure you want to delete this question?", "Delete Question", "destructive")) return;

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
                <Link href="/admin/question-bank/create">
                    <Button className="font-bold flex items-center gap-2">
                        <Plus size={18} />
                        Add Question
                    </Button>
                </Link>
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
                            <Input placeholder="Search questions..." className="pl-9 h-10" />
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
                                            <div className="font-medium text-slate-900 line-clamp-2"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.text) }} />
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
        </div>
    );
}
