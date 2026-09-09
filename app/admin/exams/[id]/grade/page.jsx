"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function GradeExamPage() {
    const { id } = useParams();
    const router  = useRouter();
    const toast   = useToast();

    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [data, setData]           = useState(null); // { examTitle, questions, totalSubmissions, totalPending }
    const [qIndex, setQIndex]       = useState(0);    // which question we're grading
    const [sIndex, setSIndex]       = useState(0);    // which student we're on
    const [marksInput, setMarksInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");

    const fetchGradeData = useCallback(async () => {
        try {
            setLoading(true);
            const res  = await fetch(`/api/v1/exams/${id}/grade`);
            const body = await res.json();
            if (!res.ok) { toast.error(body.error || "Failed to load grading data"); return; }
            setData(body);
        } catch { toast.error("Failed to load grading data"); }
        finally   { setLoading(false); }
    }, [id, toast]);

    useEffect(() => { fetchGradeData(); }, [fetchGradeData]);

    // Sync inputs when navigating
    useEffect(() => {
        if (!data) return;
        const q   = data.questions[qIndex];
        const ans = q?.answers[sIndex];
        setMarksInput(ans?.marksAwarded != null ? String(ans.marksAwarded) : "");
        setFeedbackInput(ans?.feedback || "");
    }, [qIndex, sIndex, data]);

    const currentQ   = data?.questions[qIndex];
    const currentAns = currentQ?.answers[sIndex];
    const totalStudents = currentQ?.answers.length || 0;

    const saveAndNext = useCallback(async () => {
        if (!currentQ || !currentAns || saving) return;
        const marks = parseFloat(marksInput);
        if (isNaN(marks) || marks < 0 || marks > currentQ.question.marks) {
            toast.error(`Marks must be between 0 and ${currentQ.question.marks}`);
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/exams/${id}/grade`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: currentAns.submissionId,
                    questionId:   currentQ.question._id,
                    marksAwarded: marks,
                    feedback:     feedbackInput
                })
            });
            const result = await res.json();
            if (!res.ok) { toast.error(result.error || "Failed to save grade"); return; }

            // Optimistic update in local state
            setData(prev => {
                const next = structuredClone(prev);
                next.questions[qIndex].answers[sIndex].marksAwarded = marks;
                next.questions[qIndex].answers[sIndex].feedback      = feedbackInput;
                next.questions[qIndex].answers[sIndex].needsGrading  = false;
                return next;
            });

            // Advance: next student → if last student, next question
            if (sIndex < totalStudents - 1) {
                setSIndex(s => s + 1);
            } else if (qIndex < data.questions.length - 1) {
                setQIndex(q => q + 1);
                setSIndex(0);
            } else {
                toast.success("All answers graded!");
            }
        } catch { toast.error("Failed to save grade"); }
        finally { setSaving(false); }
    }, [currentQ, currentAns, marksInput, feedbackInput, qIndex, sIndex, saving, data?.questions.length, id, toast, totalStudents]);

    // Keyboard shortcut: Enter = save & next
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Enter" && e.ctrlKey) saveAndNext();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [saveAndNext]);

    const gradedCount = data?.questions.reduce((sum, q) =>
        sum + q.answers.filter(a => a.marksAwarded != null).length, 0) || 0;
    const totalAnswers = data?.questions.reduce((sum, q) => sum + q.answers.length, 0) || 0;

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
    if (!data || data.questions.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <p className="font-bold text-slate-600 mb-1">No subjective questions to grade.</p>
                <p className="text-sm">This exam has no short answer or essay questions assigned to you.</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-6">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-[8px] text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">{data.examTitle} — Grade Answers</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Question {qIndex + 1} of {data.questions.length}
                        <span className="mx-2 text-slate-300">·</span>
                        {gradedCount} of {totalAnswers} answers graded
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: totalAnswers > 0 ? `${(gradedCount / totalAnswers) * 100}%` : '0%' }}
                />
            </div>

            {/* Question tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {data.questions.map((q, i) => (
                    <button key={q.question._id} onClick={() => { setQIndex(i); setSIndex(0); }}
                        className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-[8px] border transition-colors ${qIndex === i ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
                        Q{i + 1}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Question + model answer */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question</p>
                            <p className="text-slate-800 font-medium leading-relaxed">{currentQ?.question.text}</p>
                        </div>

                        {currentQ?.question.snippet?.code && (
                            <pre className="p-3 bg-slate-900 text-slate-100 rounded-[8px] text-xs font-mono overflow-x-auto">
                                <code>{currentQ.question.snippet.code}</code>
                            </pre>
                        )}

                        {currentQ?.question.questionImage && (
                            <div className="max-w-md rounded-[8px] overflow-hidden border border-slate-200 bg-slate-50">
                                <img src={currentQ.question.questionImage} alt="Question Diagram" className="w-full h-auto max-h-52 object-contain p-2" />
                            </div>
                        )}

                        {currentQ?.question.chapter && (
                            <p className="text-xs text-slate-400">{currentQ.question.chapter}{currentQ.question.topic ? ` · ${currentQ.question.topic}` : ''}</p>
                        )}

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            Max Marks: <span className="text-blue-600">{currentQ?.question.marks}</span>
                        </div>

                        {currentQ?.question.modelAnswer && (
                            <div className="pt-3 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Model Answer</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{currentQ.question.modelAnswer}</p>
                            </div>
                        )}

                        {currentQ?.question.rubric && (
                            <div className="pt-3 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rubric</p>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{currentQ.question.rubric}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Student answer stream */}
                <Card className="lg:col-span-3">
                    <CardContent className="p-6 space-y-5">
                        {/* Student navigation */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800">
                                    {currentAns?.student
                                        ? `${currentAns.student.profile?.firstName || ''} ${currentAns.student.profile?.lastName || ''}`.trim()
                                        : 'Unknown Student'
                                    }
                                </p>
                                <p className="text-xs text-slate-400">{currentAns?.student?.studentId || ''}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                <button onClick={() => setSIndex(s => Math.max(0, s - 1))} disabled={sIndex === 0}
                                    className="p-1.5 hover:bg-slate-100 rounded-[8px] disabled:opacity-30 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="font-bold text-slate-700">{sIndex + 1}</span>
                                <span className="text-slate-300">/</span>
                                <span>{totalStudents}</span>
                                <button onClick={() => setSIndex(s => Math.min(totalStudents - 1, s + 1))} disabled={sIndex === totalStudents - 1}
                                    className="p-1.5 hover:bg-slate-100 rounded-[8px] disabled:opacity-30 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Student answer */}
                        <div className={`min-h-[100px] p-4 rounded-[8px] border text-sm leading-relaxed ${!currentAns?.attempted ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            {currentAns?.attempted ? currentAns.answer : <span className="italic">Not attempted</span>}
                        </div>

                        {/* Quick mark buttons */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Marks</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: (currentQ?.question.marks || 0) + 1 }, (_, i) => (
                                    <button key={i} type="button"
                                        onClick={() => setMarksInput(String(i))}
                                        className={`min-w-[36px] h-9 px-3 rounded-[8px] text-sm font-bold border transition-colors ${marksInput === String(i) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}>
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Marks + feedback */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Marks / {currentQ?.question.marks}
                                </label>
                                <input
                                    type="number" min="0" max={currentQ?.question.marks} step="0.5"
                                    value={marksInput}
                                    onChange={e => setMarksInput(e.target.value)}
                                    className="w-full h-10 px-3 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-700"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Feedback</label>
                                <input
                                    type="text"
                                    value={feedbackInput}
                                    onChange={e => setFeedbackInput(e.target.value)}
                                    className="w-full h-10 px-3 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-700"
                                    placeholder="Optional comment"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-slate-400">Tip: <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Ctrl+Enter</kbd> to save & next</p>
                            <Button onClick={saveAndNext} disabled={saving} className="font-bold flex items-center gap-2">
                                {saving ? "Saving..." : <>Save & Next <ChevronRight size={16} /></>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
