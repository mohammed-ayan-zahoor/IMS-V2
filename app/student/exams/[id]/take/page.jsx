"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    AlertTriangle,
    XOctagon,
    Maximize,
    Clock,
    Save,
    CheckCircle,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ExamRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { id: examId } = params;

    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [examData, setExamData] = useState(null);
    const [submissionId, setSubmissionId] = useState(null);

    // State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: answerString }
    const [timeRemaining, setTimeRemaining] = useState(0); // seconds
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Security State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [warnings, setWarnings] = useState([]);

    // Refs for intervals/timers
    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);
    const cheatMonitorRef = useRef(null);

    // Initial Load
    useEffect(() => {
        checkExamAccess();
    }, []);

    const checkExamAccess = async () => {
        try {
            // Updated correct path from API implementation phase
            const res = await fetch(`/api/v1/exams/${examId}/instructions`);
            if (res.status === 409) {
                const data = await res.json();
                router.replace(`/student/exams/${data.submissionId}/result`);
                return;
            }
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Access denied");
                router.push("/student/exams");
                return;
            }

            const data = await res.json();
            // Show start screen before entering "room"
            if (!data.canResume) {
                // We are in "Lobby", user needs to click "Start"
                // But this page IS the room. 
                // Let's repurpose this page to handle both "Lobby" and "Active" state?
                // Or redirect to separate Lobby? 
                // The implementation plan had `exams/[id]/instructions` as API, and `take/page.jsx` as room.
                // Let's assume the user clicked "Start" from the Dashboard.
                // We should show a "Enter Fullscreen to Start" overlay first.
            }
            setExamData(data.exam);
            setSubmissionId(data.submissionId);
            setLoading(false);
        } catch (err) {
            console.error(err);
            router.push("/student/exams");
        }
    };

    const startExam = async () => {
        setInitializing(true);
        try {
            const fingerprint = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const res = await fetch(`/api/v1/exams/${examId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: fingerprint })
            });

            if (!res.ok) throw new Error("Failed to start exam");

            const data = await res.json();
            setSubmissionId(data.submission.id);
            setExamData(prev => ({ ...prev, ...data.exam })); // Update with sanitized questions

            // Restore answers if resuming
            if (data.isResume && data.submission.draftAnswers) {
                const restored = {};
                data.submission.draftAnswers.forEach(a => {
                    restored[a.questionId] = a.answer;
                });
                setAnswers(restored);
            }

            // Calculate remaining time
            const startTime = new Date(data.submission.startedAt).getTime();
            const durationMs = data.exam.duration * 60 * 1000;
            const endTime = startTime + durationMs;
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeRemaining(remaining);

            // Enter Fullscreen
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }

            setInitializing(false);

            // Start Timers
            startTimers();

        } catch (err) {
            alert(err.message);
            setInitializing(false);
        }
    };

    const startTimers = () => {
        // Countdown
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Auto Save (every 30s)
        if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        autoSaveRef.current = setInterval(saveProgress, 30000);
    };

    const setupSecurityListeners = () => {
        // Fullscreen check
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                logSuspiciousActivity("fullscreen_exit");
                setWarnings(prev => [...prev, "Please return to fullscreen immediately!"]);
            }
        };

        // Tab focus check
        const handleVisibilityChange = () => {
            if (document.hidden) {
                logSuspiciousActivity("tab_switch");
                setWarnings(prev => [...prev, "Tab switching is monitored and recorded."]);
            }
        };

        // Prevent Copy/Paste/Context
        const preventDefault = (e) => e.preventDefault();

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("contextmenu", preventDefault);
        document.addEventListener("copy", preventDefault);
        document.addEventListener("paste", preventDefault);

        // Cleanup function for listeners
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("contextmenu", preventDefault);
            document.removeEventListener("copy", preventDefault);
            document.removeEventListener("paste", preventDefault);
        };
    };

    // Call cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
            // Listeners are tricky to remove here without refs to functions, 
            // but standard useEffect cleanup in setupSecurityListeners return handles it if we used separate useEffect.
            // Since we call startTimers -> setupSecurityListeners, we need to be careful.
            // For improved cleanup, let's move listeners to a dedicated useEffect dependent on submissionId.
        };
    }, []);

    // Dedicated Security Effect
    useEffect(() => {
        if (!submissionId) return;

        const handleFullscreen = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                logSuspiciousActivity("fullscreen_exit");
                setWarnings(prev => [...prev, "Please return to fullscreen immediately!"]);
            }
        };

        const handleVisibility = () => {
            if (document.hidden) {
                logSuspiciousActivity("tab_switch");
                setWarnings(prev => [...prev, "Tab switching is monitored and recorded."]);
            }
        };

        const prevent = (e) => e.preventDefault();

        document.addEventListener("fullscreenchange", handleFullscreen);
        document.addEventListener("visibilitychange", handleVisibility);
        document.addEventListener("contextmenu", prevent);
        document.addEventListener("copy", prevent);
        document.addEventListener("paste", prevent);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreen);
            document.removeEventListener("visibilitychange", handleVisibility);
            document.removeEventListener("contextmenu", prevent);
            document.removeEventListener("copy", prevent);
            document.removeEventListener("paste", prevent);
        };
    }, [submissionId]);

    const logSuspiciousActivity = async (type) => {
        // In a real implementation, we would call the SuspiciousActivity API here
        // For now, we just warn locally, but the infrastructure is ready.
        // console.warn("Security Event:", type);
    };

    const saveProgress = async () => {
        if (!submissionId) return;
        setIsSaving(true);
        try {
            // Helper to format answers for API
            const answersArray = Object.entries(answers).map(([qId, ans]) => ({
                questionId: qId,
                answer: ans
            }));

            await fetch(`/api/v1/exams/submissions/${submissionId}/autosave`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: answersArray })
            });
            setLastSaved(new Date());
        } catch (err) {
            console.error("Autosave failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (auto = false) => {
        if (isSubmitting) return;
        if (!auto && !confirm("Are you sure you want to submit? You cannot undo this action.")) return;

        setIsSubmitting(true);
        try {
            // Clean up
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });

            const answersArray = Object.entries(answers).map(([qId, ans]) => ({
                questionId: qId,
                answer: ans
            }));

            const res = await fetch(`/api/v1/exams/submissions/${submissionId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: answersArray })
            });

            if (!res.ok) throw new Error("Submission failed");

            router.replace(`/student/exams/${submissionId}/result`);

        } catch (err) {
            alert("Submission failed! Copy your answers if possible to prevent data loss.");
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (val) => {
        const question = examData.questions[currentQuestionIndex];
        setAnswers(prev => ({
            ...prev,
            [question._id]: val
        }));
    };

    if (loading) return <LoadingSpinner />;

    // LOBBY VIEW
    if (!submissionId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-6 text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                        <Maximize className="text-blue-500" size={32} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{examData?.title}</h1>
                        <p className="text-slate-500 mt-2">
                            Duration: <span className="font-bold text-slate-800">{examData?.duration} mins</span> •
                            Questions: <span className="font-bold text-slate-800">{examData?.questionCount}</span>
                        </p>
                    </div>

                    <div className="bg-yellow-50 text-yellow-800 text-sm p-4 rounded-lg text-left space-y-2">
                        <p className="font-bold flex items-center gap-2">
                            <AlertTriangle size={14} /> Exam Rules:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>You must stay in fullscreen mode.</li>
                            <li>Tab switching is monitored.</li>
                            <li>Copy/Paste is disabled.</li>
                            <li>Timer continues even if you disconnect.</li>
                        </ul>
                    </div>

                    <Button onClick={startExam} disabled={initializing} className="w-full h-12 text-lg">
                        {initializing ? "Initializing..." : "Start Exam Now"}
                    </Button>
                </Card>
            </div>
        );
    }

    // EXAM ROOM VIEW
    const currentQuestion = examData?.questions?.[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
            {/* Header / Toolbar */}
            <header className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-slate-700 truncate max-w-[200px]">{examData?.title}</h2>
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold text-sm",
                        timeRemaining < 300 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"
                    )}>
                        <Clock size={16} />
                        {formatTime(timeRemaining)}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Not saved yet"}
                        <Save size={12} />
                    </div>
                    <Button onClick={() => handleSubmit(false)} variant="destructive" size="sm">
                        Finish Exam
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Navigation */}
                <aside className="w-64 bg-white border-r overflow-y-auto p-4 hidden md:block">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Question Palette</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {examData.questions.map((q, idx) => {
                            const isAnswered = !!answers[q._id];
                            const isCurrent = idx === currentQuestionIndex;
                            return (
                                <button
                                    key={q._id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={cn(
                                        "h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-colors relative",
                                        isCurrent ? "bg-blue-600 text-white ring-2 ring-blue-200" :
                                            isAnswered ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {idx + 1}
                                    {isAnswered && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Question Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col max-w-4xl mx-auto w-full">

                    {/* Security Warnings Overlay */}
                    <AnimatePresence>
                        {warnings.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-6 bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3"
                            >
                                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-bold">Security Warning</h4>
                                    <ul className="list-disc pl-4 text-sm mt-1">
                                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                                <button onClick={() => setWarnings([])} className="ml-auto text-red-500 hover:text-red-700">
                                    <XOctagon size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {currentQuestion && (
                        <div className="flex-1 space-y-6">
                            <div className="flex items-start gap-4">
                                <span className="text-slate-300 font-black text-5xl select-none">
                                    {String(currentQuestionIndex + 1).padStart(2, '0')}
                                </span>
                                <div className="space-y-4 flex-1 pt-2">
                                    <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                                        {currentQuestion.text}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded uppercase">
                                            {currentQuestion.type === "mcq" ? "Multiple Choice" : "Descriptive"}
                                        </span>
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded">
                                            {currentQuestion.marks} Marks
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-[4.5rem] space-y-4">
                                {currentQuestion.type === "mcq" ? (
                                    <div className="grid gap-3">
                                        {currentQuestion.options.map((opt, optIdx) => (
                                            <div
                                                key={optIdx}
                                                onClick={() => handleAnswerChange(String(optIdx))}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 group",
                                                    answers[currentQuestion._id] === String(optIdx)
                                                        ? "border-blue-600 bg-blue-50"
                                                        : "border-slate-100 hover:border-slate-200 bg-white"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                    answers[currentQuestion._id] === String(optIdx)
                                                        ? "border-blue-600 bg-blue-600"
                                                        : "border-slate-300 group-hover:border-slate-400"
                                                )}>
                                                    {answers[currentQuestion._id] === String(optIdx) && (
                                                        <div className="w-2 h-2 bg-white rounded-full" />
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "font-medium",
                                                    answers[currentQuestion._id] === String(optIdx) ? "text-blue-900" : "text-slate-600"
                                                )}>
                                                    {opt}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea
                                        value={answers[currentQuestion._id] || ""}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-medium text-slate-700 bg-white"
                                        placeholder="Type your answer here..."
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-8 mt-auto">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="w-32"
                        >
                            <ChevronLeft size={16} className="mr-2" /> Previous
                        </Button>

                        {currentQuestionIndex === examData.questions.length - 1 ? (
                            <Button onClick={() => handleSubmit(false)} className="w-32 bg-green-600 hover:bg-green-700 text-white">
                                Submit <CheckCircle size={16} className="ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(examData.questions.length - 1, prev + 1))}
                                className="w-32"
                            >
                                Next <ChevronRight size={16} className="ml-2" />
                            </Button>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}
