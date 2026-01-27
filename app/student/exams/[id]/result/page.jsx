"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Trophy,
    ArrowLeft
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function ExamResultPage() {
    const params = useParams();
    const router = useRouter();
    const { id: submissionId } = params;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchResult();
    }, []);

    const fetchResult = async () => {
        try {
            const res = await fetch(`/api/v1/exams/submissions/${submissionId}/result`);
            if (!res.ok) throw new Error("Could not fetch results");
            const json = await res.json();

            // Handle "Results not published" logic explicitly if message key exists
            if (json.submission?.message) {
                // API returns message if blocked
            }
            setData(json);
        } catch (err) {
            setError("Failed to load results.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Unable to Load Results</h2>
                    <p className="text-slate-500 mt-2 mb-6">Something went wrong or you don't have permission to view this result yet.</p>
                    <Button onClick={() => router.push("/student/exams")}>Back to Exams</Button>
                </div>
            </div>
        );
    }

    const { submission, exam } = data;
    const isPending = submission.status === "in_progress" || submission.status === "submitted";
    const isPublished = !submission.message;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.push("/student/exams")}>
                <ArrowLeft size={16} className="mr-2" /> Back to Exams
            </Button>

            {/* Score Header */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">{exam.title}</h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2 mt-2">
                                <Clock size={16} /> Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                        </div>

                        {isPublished ? (
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                                    <div className="text-4xl font-black text-slate-900">
                                        {submission.score} <span className="text-lg text-slate-400 font-bold">/ {exam.totalMarks}</span>
                                    </div>
                                </div>
                                <div className="w-px h-12 bg-slate-100 hidden md:block" />
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grade</p>
                                    <div className={cn(
                                        "text-4xl font-black",
                                        submission.percentage >= 40 ? "text-green-600" : "text-red-500"
                                    )}>
                                        {submission.percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-orange-50 text-orange-700 px-6 py-4 rounded-xl flex items-center gap-3">
                                <Clock className="animate-pulse" />
                                <div>
                                    <p className="font-bold">Evaluation Pending</p>
                                    <p className="text-xs opacity-80">Results will be published shortly.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Analysis (Only if published) */}
            {isPublished && submission.answers && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 px-2">Detailed Analysis</h2>
                    <div className="grid gap-4">
                        {submission.answers.map((ans, idx) => {
                            const isCorrect = ans.isCorrect;
                            const isSkipped = ans.yourAnswer === "" || ans.yourAnswer === undefined;

                            return (
                                <Card key={idx} className={cn(
                                    "border transition-all",
                                    isCorrect ? "border-green-100 bg-green-50/10" :
                                        isSkipped ? "border-slate-200 bg-slate-50/50" : "border-red-100 bg-red-50/10"
                                )}>
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            <div className="shrink-0 pt-1">
                                                {isCorrect ? (
                                                    <CheckCircle2 className="text-green-500" size={24} />
                                                ) : isSkipped ? (
                                                    <AlertCircle className="text-slate-400" size={24} />
                                                ) : (
                                                    <XCircle className="text-red-500" size={24} />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                            Question {idx + 1}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs font-bold px-2 py-1 rounded",
                                                            isCorrect ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {ans.marksAwarded} / {ans.maxMarks} Marks
                                                        </span>
                                                    </div>
                                                    <p className="font-semibold text-slate-800 text-lg mb-4">
                                                        {ans.questionText}
                                                    </p>

                                                    {ans.type === "mcq" && ans.options && (
                                                        <div className="grid gap-2">
                                                            {ans.options.map((option, optIdx) => {
                                                                const isUserSelected = parseInt(ans.yourAnswer, 10) === optIdx;
                                                                const isCorrectOption = parseInt(ans.correctAnswer, 10) === optIdx;

                                                                let optionStyle = "bg-white border-slate-200 text-slate-700";
                                                                let icon = null;

                                                                if (isCorrectOption) {
                                                                    optionStyle = "bg-green-100 border-green-300 text-green-800";
                                                                    icon = <CheckCircle2 size={16} className="text-green-600" />;
                                                                } else if (isUserSelected && !isCorrect) {
                                                                    optionStyle = "bg-red-50 border-red-200 text-red-800";
                                                                    icon = <XCircle size={16} className="text-red-500" />;
                                                                } else if (isUserSelected && isCorrect) {
                                                                    // Should be covered by isCorrectOption but just in case
                                                                    optionStyle = "bg-green-100 border-green-300 text-green-800";
                                                                    icon = <CheckCircle2 size={16} className="text-green-600" />;
                                                                }

                                                                return (
                                                                    <div key={optIdx} className={cn(
                                                                        "p-3 rounded-lg border text-sm flex items-center justify-between",
                                                                        optionStyle
                                                                    )}>
                                                                        <span>{option}</span>
                                                                        {icon}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {ans.type === "descriptive" && (
                                                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                            <div className="p-3 rounded-lg border bg-white border-slate-200 text-slate-700">
                                                                <span className="block text-xs font-bold opacity-60 mb-1 uppercase">Your Answer</span>
                                                                {ans.yourAnswer || "Skipped"}
                                                            </div>
                                                            {ans.correctAnswer && (
                                                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800">
                                                                    <span className="block text-xs font-bold opacity-60 mb-1 uppercase">Correct Answer Note</span>
                                                                    {ans.correctAnswer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
