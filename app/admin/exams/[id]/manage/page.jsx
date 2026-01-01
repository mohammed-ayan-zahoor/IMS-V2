"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, Search, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";

export default function ManageExamPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [exam, setExam] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [bankQuestions, setBankQuestions] = useState([]);
    const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
    const [bankLoading, setBankLoading] = useState(false);

    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        fetchExam();
    }, [id]);

    const fetchExam = async () => {
        if (!id || id === 'undefined') return;
        try {
            const res = await fetch(`/api/v1/exams/${id}`); if (!res.ok) throw new Error("Failed to fetch exam");
            const data = await res.json();
            setExam(data.exam);
            setCurrentQuestions(data.exam.questions || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load exam details");
        } finally {
            setLoading(false);
        }
    };

    const fetchBankQuestions = async () => {
        setBankLoading(true);
        try {
            const res = await fetch("/api/v1/questions"); // Fetch all questions
            const data = await res.json();

            // Filter out questions already in the exam
            const currentIds = new Set(currentQuestions.map(q => q._id));
            const available = (data.questions || []).filter(q => !currentIds.has(q._id));

            setBankQuestions(available);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch question bank");
        } finally {
            setBankLoading(false);
        }
    };

    const openAddModal = () => {
        setIsAddModalOpen(true);
        fetchBankQuestions();
        setSelectedBankQuestions([]);
    };

    const handleSelectQuestion = (qId) => {
        if (selectedBankQuestions.includes(qId)) {
            setSelectedBankQuestions(prev => prev.filter(id => id !== qId));
        } else {
            setSelectedBankQuestions(prev => [...prev, qId]);
        }
    };

    const addSelectedQuestions = () => {
        // Find the full question objects
        const toAdd = bankQuestions.filter(q => selectedBankQuestions.includes(q._id));
        setCurrentQuestions(prev => [...prev, ...toAdd]);
        setIsAddModalOpen(false);
        toast.success(`Added ${toAdd.length} questions`);
    };

    const removeQuestion = async (qId) => {
        if (await confirm({
            title: "Remove Question",
            message: "Are you sure you want to remove this question from the exam?",
            type: "danger"
        })) {
            setCurrentQuestions(prev => prev.filter(q => q._id !== qId));
            toast.info("Question removed");
        }
    };

    const handleSave = async (newStatus = null, toggleResults = null) => {
        setSaving(true);
        try {
            // Calculate total marks
            const calculatedTotalMarks = currentQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

            const payload = {
                questions: currentQuestions.map(q => q._id),
                status: newStatus || exam.status,
                totalMarks: calculatedTotalMarks
            };

            if (toggleResults !== null) {
                payload.resultsPublished = toggleResults;
            }

            const res = await fetch(`/api/v1/exams/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setExam(data.exam);
                if (toggleResults !== null) {
                    toast.success(toggleResults ? "Results Published! Students can now see their scores." : "Results Unpublished.");
                } else if (newStatus === 'published') {
                    toast.success("Exam Published Successfully!");
                } else {
                    toast.success("Changes Saved!");
                }
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save");
                throw new Error(err.error || "Failed to save");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving exam");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!exam) return <div className="p-10 text-center">Exam not found</div>;

    const totalMarks = currentQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/admin/exams")} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{exam.title}</h1>
                            <Badge className={exam.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {exam.status.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {format(new Date(exam.scheduledAt), "PPP p")} • {exam.duration} mins
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {/* Publish Results Button */}
                    {exam.status !== 'draft' && (
                        <Button
                            variant={exam.resultsPublished ? "outline" : "default"}
                            className={exam.resultsPublished ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200" : "bg-purple-600 hover:bg-purple-700 text-white"}
                            onClick={() => handleSave(null, !exam.resultsPublished)}
                            disabled={saving}
                        >
                            {exam.resultsPublished ? "Unpublish Results" : "Publish Results"}
                        </Button>
                    )}

                    {exam.status === 'draft' && (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                            onClick={async () => {
                                if (currentQuestions.length === 0) {
                                    toast.error("Add questions before publishing");
                                    return;
                                }
                                if (await confirm({
                                    title: "Publish Exam?",
                                    message: "Once published, students will be able to see this exam. Are you sure?",
                                    type: "info"
                                })) {
                                    handleSave('published');
                                }
                            }}
                            disabled={saving || currentQuestions.length === 0}
                        >
                            <CheckCircle size={18} className="mr-2" />
                            Publish Exam
                        </Button>
                    )}
                    <Button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="min-w-[120px]"
                    >
                        {saving ? "Saving..." : <><Save size={18} className="mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Questions List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Exam Questions ({currentQuestions.length})</h2>
                        <Button size="sm" onClick={openAddModal}>
                            <Plus size={16} className="mr-2" />
                            Add From Bank
                        </Button>
                    </div>

                    {currentQuestions.length === 0 ? (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <AlertCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                            <h3 className="text-slate-900 font-bold">No questions added</h3>
                            <p className="text-slate-500 text-sm mb-4">Add questions from the question bank to build this exam.</p>
                            <Button onClick={openAddModal}>Add Questions</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentQuestions.map((q, idx) => (
                                <Card key={q._id} className="group hover:border-premium-blue/30 transition-all">
                                    <div className="relative p-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <div className="space-y-1">
                                                    <div className="font-medium text-slate-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="uppercase font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{q.type}</span>
                                                        <span>•</span>
                                                        <span>{q.marks} Marks</span>
                                                        <span>•</span>
                                                        <span>{q.difficulty}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(q._id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <div className="p-5 space-y-4">
                            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Exam Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600">Total Marks</span>
                                    <span className="text-slate-900">{totalMarks}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600">Passing Marks</span>
                                    <span className="text-slate-900">{exam.passingMarks}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600">Questions</span>
                                    <span className="text-slate-900">{currentQuestions.length}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Add Questions Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                className="max-w-4xl"
                title="Add Questions from Bank"
            >
                <div className="max-h-[60vh] overflow-y-auto space-y-2 p-1">
                    {bankLoading ? <LoadingSpinner /> : (
                        bankQuestions.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="bg-slate-50 p-3 rounded-full">
                                    <Search className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-slate-900 font-medium">No questions found</p>
                                    <p className="text-slate-500 text-sm">Try refreshing or adding questions to the bank.</p>
                                </div>
                            </div>
                        ) : (
                            bankQuestions.map(q => (
                                <div
                                    key={q._id}
                                    onClick={() => handleSelectQuestion(q._id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex gap-3 ${selectedBankQuestions.includes(q._id)
                                        ? "bg-premium-blue/5 border-premium-blue ring-1 ring-premium-blue"
                                        : "bg-white border-slate-200 hover:border-premium-blue/50"
                                        }`}
                                >
                                    <div className={`w-4 h-4 mt-1 rounded-full border flex-shrink-0 flex items-center justify-center ${selectedBankQuestions.includes(q._id) ? "bg-premium-blue border-premium-blue" : "border-slate-300"
                                        }`}>
                                        {selectedBankQuestions.includes(q._id) && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-slate-900 font-medium line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                                        <p className="text-xs text-slate-500 mt-1">
                                            {q.subject} • {q.classLevel} • {q.marks} Marks
                                        </p>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
                <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                    <Button onClick={addSelectedQuestions} disabled={selectedBankQuestions.length === 0}>
                        Add {selectedBankQuestions.length} Questions
                    </Button>
                </div>
            </Modal >
        </div >
    );
}
