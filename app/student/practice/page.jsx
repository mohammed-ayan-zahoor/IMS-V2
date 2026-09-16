"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
    Play, 
    Clock, 
    Target, 
    CheckCircle2, 
    XCircle, 
    ArrowRight, 
    ChevronLeft,
    Lightbulb,
    History,
    Trophy,
    RefreshCcw,
    Timer,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { format } from "date-fns";

import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function PracticeArenaPage() {
    const toast = useToast();
    
    // UI Navigation State: "setup" | "active" | "result"
    const [step, setStep] = useState("setup");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [history, setHistory] = useState([]);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [exitModalOpen, setExitModalOpen] = useState(false);

    // Configuration State (Matching Flutter App)
    const [config, setConfig] = useState({
        subjectId: "",
        count: 10,
        difficulty: "medium", // 'easy' | 'medium' | 'hard' | 'mixed'
        timeLimitEnabled: true,
        instantExplanationsEnabled: true
    });

    // Active Quiz Session State
    const [sessionData, setSessionData] = useState({
        id: null,
        subjectName: "",
        questions: [],
        currentIndex: 0,
        userAnswers: [], // Array of { question, userAnswer, isCorrect, timeSpent }
        remainingSeconds: 600,
        totalSeconds: 600,
        showFeedbackMap: {} // index -> boolean
    });

    // Results State
    const [resultData, setResultData] = useState({
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        timeTakenSeconds: 0,
        subjectName: ""
    });

    const timerRef = useRef(null);

    // Load initial subjects and practice history
    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialData = async () => {
        try {
            const [batchesRes, histRes] = await Promise.all([
                fetch("/api/v1/student/batches"),
                fetch("/api/v1/student/practice")
            ]);
            
            const batchesData = await batchesRes.json();
            const histData = await histRes.json();

            // Extract unique subjects from student's enrolled batches
            const uniqueSubjects = [];
            const seenIds = new Set();

            (batchesData.batches || []).forEach(b => {
                if (b.course && Array.isArray(b.course.subjects)) {
                    b.course.subjects.forEach(sub => {
                        if (sub && sub._id && !seenIds.has(sub._id.toString())) {
                            seenIds.add(sub._id.toString());
                            uniqueSubjects.push({
                                _id: sub._id.toString(),
                                name: sub.name || "Subject"
                            });
                        }
                    });
                }
            });

            // Fallback: If no subjects extracted from batches, try syllabus API
            if (uniqueSubjects.length === 0) {
                try {
                    const sylRes = await fetch("/api/v1/student/syllabus");
                    const sylData = await sylRes.json();
                    if (sylData.progress && Array.isArray(sylData.progress)) {
                        sylData.progress.forEach(item => {
                            const sId = item.subjectId?.toString();
                            const sName = item.subjectName?.toString();
                            if (sId && sName && !seenIds.has(sId)) {
                                seenIds.add(sId);
                                uniqueSubjects.push({ _id: sId, name: sName });
                            }
                        });
                    }
                } catch (_) {}
            }

            setSubjects(uniqueSubjects);
            setHistory(histData.sessions || []);
            
            if (uniqueSubjects.length > 0 && !config.subjectId) {
                setConfig(prev => ({ ...prev, subjectId: uniqueSubjects[0]._id }));
            }
        } catch (error) {
            toast?.error("Failed to load arena data");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Metrics (Matching Flutter Tests Completed & Avg Accuracy)
    const testsCompleted = history.length;
    const avgAccuracy = useMemo(() => {
        if (!history.length) return 0;
        const totalScore = history.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
        return Math.round(totalScore / history.length);
    }, [history]);

    // Timer logic for active quiz
    useEffect(() => {
        if (step === "active" && config.timeLimitEnabled) {
            timerRef.current = setInterval(() => {
                setSessionData(prev => {
                    if (prev.remainingSeconds <= 1) {
                        clearInterval(timerRef.current);
                        // Auto submit when timer reaches zero
                        handleAutoSubmit();
                        return { ...prev, remainingSeconds: 0 };
                    }
                    return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, config.timeLimitEnabled]);

    // Start New Session
    const startSession = async () => {
        if (!config.subjectId) {
            return toast?.error("Please select a subject to begin");
        }

        setGenerating(true);
        try {
            const res = await fetch("/api/v1/student/practice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectId: config.subjectId,
                    count: config.count,
                    difficulty: config.difficulty
                })
            });

            const data = await res.json();
            if (!res.ok) {
                return toast?.error(data.error || "No practice questions found for this configuration");
            }

            if (!data.questions || data.questions.length === 0) {
                return toast?.error("No questions available for this subject");
            }

            const activeSub = subjects.find(s => s._id === config.subjectId);
            const totalSecs = config.timeLimitEnabled ? data.questions.length * 60 : 0;

            setSessionData({
                id: data.sessionId,
                subjectName: activeSub?.name || "Subject",
                questions: data.questions,
                currentIndex: 0,
                userAnswers: new Array(data.questions.length).fill(null),
                remainingSeconds: totalSecs,
                totalSeconds: totalSecs,
                showFeedbackMap: {}
            });

            setStep("active");
        } catch (error) {
            toast?.error("Network error while starting practice session");
        } finally {
            setGenerating(false);
        }
    };

    // Handle Option Selection
    const handleSelectOption = (optionIndex) => {
        const currentQ = sessionData.questions[sessionData.currentIndex];
        if (!currentQ) return;

        // If instant explanations is on and answer already registered, don't allow change
        if (config.instantExplanationsEnabled && sessionData.showFeedbackMap[sessionData.currentIndex]) {
            return;
        }

        const isCorrect = optionIndex.toString() === currentQ.correctAnswer?.toString();
        const updatedAnswers = [...sessionData.userAnswers];
        updatedAnswers[sessionData.currentIndex] = {
            question: currentQ._id,
            userAnswer: optionIndex.toString(),
            isCorrect,
            timeSpent: 0
        };

        const updatedFeedback = { ...sessionData.showFeedbackMap };
        if (config.instantExplanationsEnabled) {
            updatedFeedback[sessionData.currentIndex] = true;
        }

        setSessionData(prev => ({
            ...prev,
            userAnswers: updatedAnswers,
            showFeedbackMap: updatedFeedback
        }));
    };

    // Navigation between questions
    const handleNext = () => {
        if (sessionData.currentIndex < sessionData.questions.length - 1) {
            setSessionData(prev => ({
                ...prev,
                currentIndex: prev.currentIndex + 1
            }));
        } else {
            handleSubmitSession();
        }
    };

    const handlePrevious = () => {
        if (sessionData.currentIndex > 0) {
            setSessionData(prev => ({
                ...prev,
                currentIndex: prev.currentIndex - 1
            }));
        }
    };

    // Auto submit on timer timeout
    const handleAutoSubmit = () => {
        toast?.error("Time has expired! Submitting your test automatically...");
        handleSubmitSession();
    };

    // Submit practice session
    const handleSubmitSession = async () => {
        if (submitting) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        const totalQ = sessionData.questions.length;
        let correct = 0;

        const formattedAnswers = sessionData.questions.map((q, idx) => {
            const ans = sessionData.userAnswers[idx];
            const isCorr = ans?.isCorrect === true;
            if (isCorr) correct++;
            return {
                question: q._id,
                userAnswer: ans ? ans.userAnswer : null,
                isCorrect: isCorr
            };
        });

        const scorePercent = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
        const timeTaken = config.timeLimitEnabled 
            ? Math.max(0, sessionData.totalSeconds - sessionData.remainingSeconds)
            : 0;

        try {
            const res = await fetch(`/api/v1/student/practice/${sessionData.id}/submit`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    answers: formattedAnswers,
                    score: scorePercent,
                    correctCount: correct
                })
            });

            if (res.ok) {
                setResultData({
                    score: scorePercent,
                    correctCount: correct,
                    totalQuestions: totalQ,
                    timeTakenSeconds: timeTaken,
                    subjectName: sessionData.subjectName
                });
                setStep("result");
                fetchInitialData(); // Refresh history
            } else {
                toast?.error("Error saving your results to portal");
            }
        } catch (err) {
            toast?.error("Network error submitting results");
        } finally {
            setSubmitting(false);
        }
    };

    // Format MM:SS for countdown
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const difficulties = [
        { id: "easy", label: "Foundation" },
        { id: "medium", label: "Intermediate" },
        { id: "hard", label: "Advanced" }
    ];

    if (loading && step === "setup") return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 p-3 sm:p-6 safe-pb">

            {/* STEP 1: SETUP SCREEN */}
            {step === "setup" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    
                    {/* Top Performance Metrics Bar (Matching Flutter Tests Completed & Avg Accuracy) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-[20px] p-5 border border-[#E9E8F0] shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                            <div>
                                <p className="text-xs font-semibold text-[#8D8A9B] uppercase tracking-wider">
                                    Tests Completed
                                </p>
                                <p className="text-3xl font-extrabold text-[#1E1B2E] mt-1">
                                    {testsCompleted}
                                </p>
                                <p className="text-xs text-[#8D8A9B] mt-0.5">Session history</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-[20px] p-5 border border-[#E9E8F0] shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                            <div>
                                <p className="text-xs font-semibold text-[#8D8A9B] uppercase tracking-wider">
                                    Avg Accuracy
                                </p>
                                <p className="text-3xl font-extrabold text-[#1E1B2E] mt-1">
                                    {avgAccuracy}%
                                </p>
                                <p className="text-xs text-[#8D8A9B] mt-0.5">Overall score</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] text-[#16A34A] flex items-center justify-center shrink-0">
                                <Target size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Main Practice Setup Card */}
                    <div className="relative p-6 sm:p-10 rounded-[32px] bg-white border border-[#E9E8F0] text-[#1E1B2E] overflow-hidden shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
                            
                            {/* Left Hero Description */}
                            <div className="space-y-4 text-center lg:text-left flex-1">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                                    <Trophy size={13} />
                                    <span>Self-Study Arena</span>
                                </div>

                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                                    Mock Test <span className="text-[#2563EB] italic font-black">Generator</span>
                                </h1>

                                <p className="text-sm sm:text-base text-[#545F72] max-w-lg leading-relaxed">
                                    Sharpen your skills by generating custom practice tests from our curated question bank.
                                </p>

                                <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#FAF9FC] rounded-full border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E]">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span>Instant Results</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#FAF9FC] rounded-full border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E]">
                                        <Lightbulb size={14} className="text-amber-500" />
                                        <span>Detailed Explanations</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Interactive Config Panel (Aligned with Flutter) */}
                            <div className="w-full lg:w-[420px] bg-[#FAF9FC] rounded-[24px] p-6 border border-[#E9E8F0] shadow-sm space-y-5 shrink-0">
                                
                                {/* 1. Select Subject */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#545F72]">
                                        Select Subject
                                    </label>
                                    <select
                                        value={config.subjectId}
                                        onChange={(e) => setConfig({ ...config, subjectId: e.target.value })}
                                        disabled={subjects.length === 0}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#E9E8F0] text-sm font-semibold text-[#0D1C2E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer disabled:opacity-60"
                                    >
                                        {subjects.length === 0 ? (
                                             <option value="">No subjects assigned</option>
                                        ) : (
                                            subjects.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* 2. Difficulty Level Segment (Matching Flutter Foundation/Intermediate/Advanced) */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#545F72]">
                                        Difficulty Level
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-[#E9E8F0]">
                                        {difficulties.map(diff => {
                                            const isSelected = config.difficulty === diff.id;
                                            return (
                                                <button
                                                    key={diff.id}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, difficulty: diff.id })}
                                                    className={cn(
                                                        "py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                        isSelected
                                                            ? "bg-[#002045] text-white shadow-sm"
                                                            : "text-[#545F72] hover:text-[#0D1C2E] hover:bg-slate-50"
                                                    )}
                                                >
                                                    {diff.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Question Count Quick Select */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#545F72]">
                                        <span>Questions</span>
                                        <span className="text-[#002045] font-extrabold">{config.count} Qs</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[5, 10, 15, 20, 25].map(cnt => (
                                            <button
                                                key={cnt}
                                                type="button"
                                                onClick={() => setConfig({ ...config, count: cnt })}
                                                className={cn(
                                                    "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                    config.count === cnt
                                                        ? "bg-[#002045] border-[#002045] text-white shadow-sm"
                                                        : "bg-white border-[#E9E8F0] text-[#545F72] hover:border-[#CBD5E1]"
                                                )}
                                            >
                                                {cnt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Feature Toggles (Time Limit & Instant Explanations) */}
                                <div className="pt-2 border-t border-[#E9E8F0] space-y-3">
                                    {/* Time Limit Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-[#545F72]" />
                                            <div>
                                                <p className="text-xs font-bold text-[#0D1C2E]">
                                                    Time Limit (1 min/question)
                                                </p>
                                                <p className="text-[11px] text-[#8D8A9B]">
                                                    {config.timeLimitEnabled ? `${config.count} min total test time` : "Untimed self-study pace"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={config.timeLimitEnabled}
                                            onClick={() => setConfig({ ...config, timeLimitEnabled: !config.timeLimitEnabled })}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                config.timeLimitEnabled ? "bg-[#002045]" : "bg-[#E2E8F0]"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    config.timeLimitEnabled ? "translate-x-5" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* Instant Explanations Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Lightbulb size={16} className="text-[#545F72]" />
                                            <div>
                                                <p className="text-xs font-bold text-[#0D1C2E]">
                                                    Instant Explanations
                                                </p>
                                                <p className="text-[11px] text-[#8D8A9B]">
                                                    {config.instantExplanationsEnabled ? "Reveal answer & why immediately" : "Test mode with review at end"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={config.instantExplanationsEnabled}
                                            onClick={() => setConfig({ ...config, instantExplanationsEnabled: !config.instantExplanationsEnabled })}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                config.instantExplanationsEnabled ? "bg-[#002045]" : "bg-[#E2E8F0]"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    config.instantExplanationsEnabled ? "translate-x-5" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Start Practice Button */}
                                <Button
                                    onClick={startSession}
                                    disabled={generating || subjects.length === 0}
                                    className="w-full h-12 rounded-xl bg-[#002045] hover:bg-[#1E1B2E] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-900/10 cursor-pointer"
                                >
                                    {generating ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Generating Session...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <span>Start Mock Test</span>
                                            <Play size={14} className="fill-current" />
                                        </div>
                                    )}
                                </Button>
                            </div>

                        </div>
                    </div>

                    {/* RECENT ATTEMPTS SECTION (Matching Flutter History List) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2.5">
                                <History size={18} className="text-[#2563EB]" />
                                <h2 className="text-base sm:text-lg font-bold text-[#0D1C2E]">
                                    Recent Practice Sessions
                                </h2>
                            </div>
                            {history.length > 5 && (
                                <button
                                    onClick={() => setShowAllHistory(!showAllHistory)}
                                    className="text-xs font-bold text-[#002045] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <span>{showAllHistory ? "Show Less" : `View All (${history.length})`}</span>
                                    {showAllHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            )}
                        </div>

                        {history.length === 0 ? (
                            <div className="bg-white rounded-[20px] border border-[#E9E8F0] p-10 text-center space-y-2">
                                <p className="text-sm font-semibold text-[#545F72]">
                                    No practice attempts yet. Start your first session above!
                                </p>
                                <p className="text-xs text-[#8D8A9B]">
                                    Your test completions and accuracy scores will be tracked here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {(showAllHistory ? history : history.slice(0, 5)).map((session) => {
                                    const isCompleted = session.status === "completed";
                                    const score = Math.round(Number(session.score) || 0);

                                    return (
                                        <div
                                            key={session._id}
                                            className="bg-white rounded-[16px] p-4 border border-[#E9E8F0] shadow-sm flex items-center justify-between gap-4 transition-all hover:border-[#CBD5E1]"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                    isCompleted ? "bg-[#E6F4EA] text-[#16A34A]" : "bg-[#EFF4FF] text-[#2563EB]"
                                                )}>
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-sm font-bold text-[#0D1C2E] truncate">
                                                            {session.subject?.name || "General Practice"}
                                                        </h3>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EFF4FF] text-[#2563EB]">
                                                            {session.difficulty || "MIXED"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#545F72] mt-0.5">
                                                        {session.totalQuestions || 10} Questions • {format(new Date(session.createdAt), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className={cn(
                                                    "text-base font-extrabold block",
                                                    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-blue-600" : "text-amber-600"
                                                )}>
                                                    {score}%
                                                </span>
                                                <span className="text-[11px] font-semibold text-[#545F72]">
                                                    {session.correctCount || 0}/{session.totalQuestions || 10} Correct
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* STEP 2: ACTIVE INTERACTIVE QUIZ SESSION (Matching Flutter QuizModalView) */}
            {step === "active" && sessionData.questions.length > 0 && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
                    
                    {/* Top Control Bar: Exit Button, Progress & Timer Pill */}
                    <div className="bg-white rounded-[20px] p-4 border border-[#E9E8F0] shadow-sm flex items-center justify-between gap-4">
                        <button
                            onClick={() => setExitModalOpen(true)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#545F72] hover:text-[#0D1C2E] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                            <span>Exit Test</span>
                        </button>

                        <div className="flex items-center gap-3">
                            {/* Live Timer Pill */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors",
                                !config.timeLimitEnabled
                                    ? "bg-[#FAF9FC] border-[#E9E8F0] text-[#545F72]"
                                    : sessionData.remainingSeconds < 60
                                        ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
                                        : "bg-[#EFF4FF] border-blue-200 text-[#002045]"
                            )}>
                                <Timer size={14} />
                                <span>
                                    {config.timeLimitEnabled ? formatTime(sessionData.remainingSeconds) : "Untimed"}
                                </span>
                            </div>

                            {/* Difficulty Tag */}
                            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                                {sessionData.questions[sessionData.currentIndex]?.difficulty?.toUpperCase() || "MEDIUM"}
                            </span>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E9E8F0] shadow-sm space-y-6">
                        
                        {/* Question Tracker & Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-[#545F72]">
                                <span>
                                    Question {sessionData.currentIndex + 1} of {sessionData.questions.length}
                                </span>
                                <span className="text-[#2563EB]">
                                    {Math.round(((sessionData.currentIndex + 1) / sessionData.questions.length) * 100)}% Complete
                                </span>
                            </div>
                            <div className="w-full h-2 bg-[#EFF4FF] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#002045] transition-all duration-300"
                                    style={{ width: `${((sessionData.currentIndex + 1) / sessionData.questions.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Question Text */}
                        <div className="pt-2">
                            <div 
                                className="text-lg sm:text-xl font-bold text-[#0D1C2E] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: sessionData.questions[sessionData.currentIndex]?.text || "" }}
                            />
                        </div>

                        {/* Options List (Matching Flutter styling: circle A-D, instant feedback colors) */}
                        <div className="space-y-3">
                            {(sessionData.questions[sessionData.currentIndex]?.options || []).map((option, idx) => {
                                const currentAnswer = sessionData.userAnswers[sessionData.currentIndex];
                                const isSelected = currentAnswer?.userAnswer === idx.toString();
                                const isCorrectOption = sessionData.questions[sessionData.currentIndex]?.correctAnswer?.toString() === idx.toString();
                                const isAnswered = currentAnswer != null;
                                const showInstant = config.instantExplanationsEnabled && isAnswered;

                                let borderClass = "border-[#E9E8F0] hover:border-[#CBD5E1] bg-white text-[#0D1C2E]";
                                let badgeClass = "bg-[#EFF4FF] text-[#002045]";

                                if (showInstant) {
                                    if (isCorrectOption) {
                                        borderClass = "border-emerald-500 bg-emerald-50 text-emerald-900";
                                        badgeClass = "bg-emerald-500 text-white";
                                    } else if (isSelected && !isCorrectOption) {
                                        borderClass = "border-rose-500 bg-rose-50 text-rose-900";
                                        badgeClass = "bg-rose-500 text-white";
                                    }
                                } else if (isSelected) {
                                    borderClass = "border-[#002045] bg-[#EFF4FF] text-[#002045] font-bold shadow-sm";
                                    badgeClass = "bg-[#002045] text-white";
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectOption(idx)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 cursor-pointer",
                                            borderClass
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                            badgeClass
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className="text-sm font-semibold flex-1">
                                            {option}
                                        </span>
                                        {showInstant && isCorrectOption && (
                                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                        )}
                                        {showInstant && isSelected && !isCorrectOption && (
                                            <XCircle size={18} className="text-rose-600 shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Instant Explanation Box (Matching Flutter Explanation Card) */}
                        {config.instantExplanationsEnabled && sessionData.showFeedbackMap[sessionData.currentIndex] && (
                            <div className="p-4 rounded-xl bg-[#EFF4FF] border border-blue-200 text-[#0D1C2E] space-y-1.5 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#002045]">
                                    <Lightbulb size={16} />
                                    <span>Explanation</span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#545F72] leading-relaxed">
                                    {sessionData.questions[sessionData.currentIndex]?.explanation || "The correct answer is confirmed based on the curriculum."}
                                </p>
                            </div>
                        )}

                        {/* Navigation Buttons (Previous, Next / Submit) */}
                        <div className="pt-4 border-t border-[#E9E8F0] flex items-center justify-between gap-4">
                            {sessionData.currentIndex > 0 ? (
                                <button
                                    onClick={handlePrevious}
                                    className="px-4 py-2.5 rounded-xl border border-[#E9E8F0] text-xs font-bold text-[#0D1C2E] hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Previous
                                </button>
                            ) : (
                                <div />
                            )}

                            <Button
                                onClick={handleNext}
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#1E1B2E] text-white text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                            >
                                {submitting ? (
                                    "Saving..."
                                ) : sessionData.currentIndex === sessionData.questions.length - 1 ? (
                                    "Submit Test"
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span>Next Question</span>
                                        <ArrowRight size={14} />
                                    </div>
                                )}
                            </Button>
                        </div>

                    </div>
                </div>
            )}

            {/* STEP 3: RESULT CELEBRATION VIEW (Matching Flutter Result Sheet) */}
            {step === "result" && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="bg-white rounded-[32px] p-8 sm:p-12 text-center border border-[#E9E8F0] shadow-sm space-y-6 relative overflow-hidden">
                        
                        {/* Trophy Icon */}
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Trophy size={40} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D1C2E]">
                                Practice Complete!
                            </h2>
                            <p className="text-sm text-[#545F72]">
                                You answered <strong className="text-[#0D1C2E]">{resultData.correctCount}</strong> out of <strong className="text-[#0D1C2E]">{resultData.totalQuestions}</strong> questions correctly in <strong className="text-[#2563EB]">{resultData.subjectName}</strong>.
                            </p>
                        </div>

                        {/* Large Score Display */}
                        <div className="py-2">
                            <span className={cn(
                                "text-5xl sm:text-6xl font-black tracking-tight",
                                resultData.score >= 80 ? "text-emerald-600" : resultData.score >= 50 ? "text-blue-600" : "text-amber-600"
                            )}>
                                {resultData.score}%
                            </span>
                        </div>

                        {/* Detailed Metric Cards */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="bg-[#FAF9FC] p-4 rounded-2xl border border-[#E9E8F0]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Correct</p>
                                <p className="text-lg font-black text-emerald-600 mt-1">
                                    {resultData.correctCount}/{resultData.totalQuestions}
                                </p>
                            </div>
                            <div className="bg-[#FAF9FC] p-4 rounded-2xl border border-[#E9E8F0]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Accuracy</p>
                                <p className="text-lg font-black text-blue-600 mt-1">
                                    {resultData.score}%
                                </p>
                            </div>
                            <div className="bg-[#FAF9FC] p-4 rounded-2xl border border-[#E9E8F0]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Time</p>
                                <p className="text-lg font-black text-slate-700 mt-1">
                                    {resultData.timeTakenSeconds > 0 ? formatTime(resultData.timeTakenSeconds) : "Untimed"}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={() => setStep("setup")}
                                className="h-12 px-8 rounded-xl bg-[#002045] hover:bg-[#1E1B2E] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                Back to Arena
                            </Button>
                            <Button
                                variant="outline"
                                onClick={startSession}
                                className="h-12 px-8 rounded-xl border border-[#E9E8F0] text-xs font-bold text-[#0D1C2E] hover:bg-slate-50 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <RefreshCcw size={14} />
                                    <span>Try Again</span>
                                </div>
                            </Button>
                        </div>

                    </div>
                </div>
            )}

            {/* EXIT CONFIRMATION MODAL */}
            {exitModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#E9E8F0]">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-[#0D1C2E]">Exit Practice Session?</h3>
                            <p className="text-xs text-[#545F72]">
                                Your current progress in this practice test will not be saved.
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setExitModalOpen(false)}
                                className="flex-1 h-10 text-xs font-bold cursor-pointer"
                            >
                                Continue Test
                            </Button>
                            <Button
                                onClick={() => {
                                    setExitModalOpen(false);
                                    if (timerRef.current) clearInterval(timerRef.current);
                                    setStep("setup");
                                }}
                                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                            >
                                Exit
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
