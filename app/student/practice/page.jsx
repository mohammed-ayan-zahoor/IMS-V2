"use client";

import { useState, useEffect } from "react";
import { 
    Dumbbell, 
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
    LayoutGrid,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function PracticeArenaPage() {
    const toast = useToast();
    
    // UI State
    const [step, setStep] = useState("setup"); // setup, active, result
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [history, setHistory] = useState([]);

    // Config State
    const [config, setConfig] = useState({
        subjectId: "",
        count: 10,
        difficulty: "mixed"
    });

    // Active Session State
    const [sessionData, setSessionData] = useState({
        id: null,
        questions: [],
        currentIndex: 0,
        userAnswers: [],
        correctCount: 0,
        showFeedback: false,
        isSaving: false
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [subRes, histRes] = await Promise.all([
                fetch("/api/v1/student/batches"), // Subjects are inside batches
                fetch("/api/v1/student/practice")
            ]);
            
            const subData = await subRes.json();
            const histData = await histRes.json();

            // Extract unique subjects from batches
            const uniqueSubjects = [];
            const subIds = new Set();
            (subData.batches || []).forEach(batch => {
                (batch.subjects || []).forEach(sub => {
                    if (!subIds.has(sub._id)) {
                        subIds.add(sub._id);
                        uniqueSubjects.push(sub);
                    }
                });
            });

            setSubjects(uniqueSubjects);
            setHistory(histData.sessions || []);
            
            if (uniqueSubjects.length > 0) {
                setConfig(prev => ({ ...prev, subjectId: uniqueSubjects[0]._id }));
            }
        } catch (error) {
            toast.error("Failed to load arena data");
        } finally {
            setLoading(false);
        }
    };

    const startSession = async () => {
        if (!config.subjectId) return toast.error("Please select a subject");
        setLoading(true);
        try {
            const res = await fetch("/api/v1/student/practice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            if (res.ok) {
                setSessionData({
                    id: data.sessionId,
                    questions: data.questions,
                    currentIndex: 0,
                    userAnswers: new Array(data.questions.length).fill(null),
                    correctCount: 0,
                    showFeedback: false,
                    isSaving: false
                });
                setStep("active");
            } else {
                toast.error(data.error || "Failed to start session");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (optionIdx) => {
        if (sessionData.showFeedback) return;

        const currentQuestion = sessionData.questions[sessionData.currentIndex];
        const isCorrect = optionIdx.toString() === currentQuestion.correctAnswer;

        const newUserAnswers = [...sessionData.userAnswers];
        newUserAnswers[sessionData.currentIndex] = {
            question: currentQuestion._id,
            userAnswer: optionIdx.toString(),
            isCorrect,
            timeSpent: 0 // Could add timer logic
        };

        setSessionData(prev => ({
            ...prev,
            userAnswers: newUserAnswers,
            correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
            showFeedback: true
        }));
    };

    const nextQuestion = () => {
        if (sessionData.currentIndex < sessionData.questions.length - 1) {
            setSessionData(prev => ({
                ...prev,
                currentIndex: prev.currentIndex + 1,
                showFeedback: false
            }));
        } else {
            completeSession();
        }
    };

    const completeSession = async () => {
        setSessionData(prev => ({ ...prev, isSaving: true }));
        try {
            const res = await fetch(`/api/v1/student/practice/${sessionData.id}/submit`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    answers: sessionData.userAnswers,
                    score: Math.round((sessionData.correctCount / sessionData.questions.length) * 100),
                    correctCount: sessionData.correctCount
                })
            });
            if (res.ok) {
                setStep("result");
                fetchInitialData(); // Refresh history
            }
        } catch (error) {
            toast.error("Error saving results");
        } finally {
            setSessionData(prev => ({ ...prev, isSaving: false }));
        }
    };

    if (loading && step === "setup") return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 p-4">
            {step === "setup" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Hero Setup - Soft Premium Theme */}
                    <div className="relative p-12 rounded-[4rem] bg-white border border-slate-100 text-slate-900 overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-premium-blue/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                        
                        <div className="relative flex flex-col md:flex-row justify-between items-center gap-12">
                            <div className="space-y-6 text-center md:text-left">
                                <Badge variant="neutral" className="bg-amber-50 text-amber-600 border-amber-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <Trophy size={12} className="mr-2" /> Self-Study Arena
                                </Badge>
                                <h1 className="text-4xl md:text-5xl font-black italic tracking-tight leading-none">
                                    Mock Test <br/> <span className="text-premium-blue">Generator</span>
                                </h1>
                                <p className="text-slate-500 font-medium max-w-md">Sharpen your skills by generating custom practice tests from our curated question bank.</p>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <span className="text-xs font-bold text-slate-700">Instant Results</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Lightbulb size={16} className="text-amber-500" />
                                        <span className="text-xs font-bold text-slate-700">Detailed Explanations</span>
                                    </div>
                                </div>
                            </div>

                            <Card className="w-full md:w-96 bg-white rounded-[3rem] p-8 shadow-2xl border-none text-slate-900">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Subject</label>
                                        <select 
                                            value={config.subjectId}
                                            onChange={(e) => setConfig({ ...config, subjectId: e.target.value })}
                                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold text-sm"
                                        >
                                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Questions</label>
                                            <select 
                                                value={config.count}
                                                onChange={(e) => setConfig({ ...config, count: e.target.value })}
                                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                                            >
                                                {[5, 10, 15, 20, 25].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty</label>
                                            <select 
                                                value={config.difficulty}
                                                onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                                            >
                                                <option value="mixed">Mixed</option>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Button onClick={startSession} className="w-full h-14 rounded-2xl shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-xs">
                                        Start Mock Test <Play size={16} className="ml-2 fill-current" />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4">
                            <History size={20} className="text-blue-500" />
                            <h2 className="text-xl font-black italic text-slate-900 tracking-tight uppercase">Recent Attempts</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {history.map(session => (
                                <Card key={session._id} className="p-6 rounded-[2.5rem] border-slate-100 hover:border-blue-200 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Target size={20} />
                                        </div>
                                        <Badge variant={session.score >= 80 ? 'success' : session.score >= 50 ? 'info' : 'danger'}>
                                            {session.score}%
                                        </Badge>
                                    </div>
                                    <h3 className="font-black italic text-slate-900 line-clamp-1 mb-1">{session.subject?.name || "Deleted Subject"}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                        {format(new Date(session.createdAt), "MMM d, yyyy")}
                                    </p>
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 pt-4 border-t border-slate-50">
                                        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> {session.correctCount} Correct</span>
                                        <span className="flex items-center gap-1.5"><Clock size={12} /> {session.totalQuestions} Qs</span>
                                    </div>
                                </Card>
                            ))}
                            {history.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold italic">No practice attempts yet. Start your first session above!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === "active" && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                    {/* Progress Header */}
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setStep("setup")} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h3 className="font-black text-slate-900 italic tracking-tight">Practice Session</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {sessionData.currentIndex + 1} of {sessionData.questions.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                             <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Correct</p>
                                <p className="text-lg font-black text-emerald-500">{sessionData.correctCount}</p>
                             </div>
                             <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                 <Dumbbell size={24} />
                             </div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={sessionData.currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <Card className="rounded-[3rem] p-10 border-none shadow-2xl space-y-8 min-h-[500px] flex flex-col">
                                <div className="space-y-4">
                                    <Badge variant="neutral" className="bg-slate-100 text-slate-500 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {sessionData.questions[sessionData.currentIndex].difficulty} Difficulty
                                    </Badge>
                                    <div 
                                        className="text-2xl font-bold text-slate-900 leading-tight"
                                        dangerouslySetInnerHTML={{ __html: sessionData.questions[sessionData.currentIndex].text }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                                    {sessionData.questions[sessionData.currentIndex].options.map((option, idx) => {
                                        const isSelected = sessionData.userAnswers[sessionData.currentIndex]?.userAnswer === idx.toString();
                                        const isCorrect = idx.toString() === sessionData.questions[sessionData.currentIndex].correctAnswer;
                                        const showFeedback = sessionData.showFeedback;
                                        
                                        return (
                                            <button 
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                disabled={showFeedback}
                                                className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden group ${
                                                    showFeedback && isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-900" :
                                                    showFeedback && isSelected && !isCorrect ? "bg-rose-50 border-rose-500 text-rose-900" :
                                                    isSelected ? "bg-blue-50 border-blue-500 text-blue-900" :
                                                    "bg-white border-slate-100 hover:border-slate-200 text-slate-600"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border-2 transition-colors ${
                                                        showFeedback && isCorrect ? "bg-emerald-500 border-emerald-500 text-white" :
                                                        showFeedback && isSelected && !isCorrect ? "bg-rose-500 border-rose-500 text-white" :
                                                        isSelected ? "bg-blue-500 border-blue-500 text-white" :
                                                        "bg-slate-50 border-slate-200 text-slate-400 group-hover:bg-slate-100"
                                                    }`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className="font-bold flex-1">{option}</span>
                                                    
                                                    {showFeedback && isCorrect && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
                                                    {showFeedback && isSelected && !isCorrect && <XCircle size={20} className="text-rose-500 shrink-0" />}
                                                </div>
                                                
                                                {!showFeedback && (
                                                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {sessionData.showFeedback && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-6 rounded-[2rem] border ${
                                            sessionData.userAnswers[sessionData.currentIndex].isCorrect 
                                                ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
                                                : "bg-blue-50 border-blue-100 text-blue-900"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Lightbulb size={18} />
                                            <h4 className="font-black italic uppercase text-[10px] tracking-widest">Explanation</h4>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed">
                                            {sessionData.questions[sessionData.currentIndex].explanation || "The correct answer is confirmed based on the curriculum. No further explanation provided."}
                                        </p>
                                    </motion.div>
                                )}

                                <div className="flex justify-end pt-6 border-t border-slate-50">
                                    <Button 
                                        onClick={nextQuestion}
                                        disabled={!sessionData.showFeedback || sessionData.isSaving}
                                        className="h-14 px-10 rounded-2xl shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-xs"
                                    >
                                        {sessionData.currentIndex === sessionData.questions.length - 1 ? (sessionData.isSaving ? "Saving..." : "Finish Session") : "Next Question"}
                                        <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {step === "result" && (
                <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-700">
                    <Card className="rounded-[4rem] p-16 text-center border-none shadow-2xl space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent -mt-32 blur-[100px] pointer-events-none"></div>
                        
                        <div className="relative space-y-6">
                            <div className="w-32 h-32 bg-amber-100 rounded-[3rem] flex items-center justify-center text-amber-500 mx-auto mb-8 animate-bounce-subtle">
                                <Trophy size={64} />
                            </div>
                            <h2 className="text-5xl font-black italic tracking-tighter text-slate-900">
                                Session Complete!
                            </h2>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                Great job! You've just completed a practice session in <span className="text-blue-600 font-bold">{subjects.find(s => s._id === config.subjectId)?.name}</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-3xl mx-auto">
                            <ResultStat label="Total Score" value={`${Math.round((sessionData.correctCount / sessionData.questions.length) * 100)}%`} color="blue" />
                            <ResultStat label="Correct Answers" value={sessionData.correctCount} total={sessionData.questions.length} color="emerald" />
                            <ResultStat label="Questions" value={sessionData.questions.length} color="slate" />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-10">
                            <Button onClick={() => setStep("setup")} className="h-14 px-12 rounded-[2rem] shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-[10px]">
                                Back to Arena <LayoutGrid size={16} className="ml-2" />
                            </Button>
                            <Button variant="outline" onClick={startSession} className="h-14 px-12 rounded-[2rem] border-2 font-black uppercase tracking-widest text-[10px]">
                                Try Again <RefreshCcw size={16} className="ml-2" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function ResultStat({ label, value, total, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        slate: "bg-slate-50 text-slate-600"
    };

    return (
        <div className={`p-8 rounded-[3rem] ${colors[color]} text-center border border-white shadow-inner`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
            <p className="text-4xl font-black italic tracking-tight">
                {value}{total && <span className="text-lg opacity-40">/{total}</span>}
            </p>
        </div>
    );
}
