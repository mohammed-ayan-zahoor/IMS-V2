"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
    Clock,
    Calendar,
    FileText,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    PlayCircle,
    RotateCcw
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function StudentExamList() {
    const router = useRouter();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await fetch("/api/v1/exams/student");
            if (!res.ok) throw new Error("Failed to fetch exams");
            const data = await res.json();
            setExams(data.exams || []);
        } catch (err) {
            console.error(err);
            setError("Could not load your exams. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "available": return "bg-green-100 text-green-700 border-green-200";
            case "upcoming": return "bg-blue-100 text-blue-700 border-blue-200";
            case "missed": return "bg-red-100 text-red-700 border-red-200";
            case "submitted": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "evaluated": return "bg-purple-100 text-purple-700 border-purple-200";
            case "in_progress": return "bg-orange-100 text-orange-700 border-orange-200 animate-pulse";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "in_progress": return "Resumable";
            default: return status.replace("_", " ");
        }
    };

    const handleAction = (exam) => {
        if (exam.submissionStatus === "available" || exam.submissionStatus === "in_progress") {
            router.push(`/student/exams/${exam._id}/take`);
        } else if (exam.submissionStatus === "submitted" || exam.submissionStatus === "evaluated") {
            // Use exam._id so the API returns the best attempt, not a specific one
            router.push(`/student/exams/${exam._id}/result`);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Error Loading Exams</h3>
                <p className="text-slate-500 mb-4">{error}</p>
                <Button onClick={fetchExams} variant="outline">Try Again</Button>
            </div>
        );
    }

    const availableExams = exams.filter(e => ["available", "in_progress"].includes(e.submissionStatus));
    const upcomingExams = exams.filter(e => e.submissionStatus === "upcoming");
    const pastExams = exams.filter(e => ["submitted", "evaluated", "missed"].includes(e.submissionStatus));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Examinations</h1>
                <p className="text-slate-500 mt-1">View and take your scheduled assessments.</p>
            </div>

            {availableExams.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <PlayCircle className="text-green-600" size={20} />
                        Active Now
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {availableExams.map(exam => (
                            <ExamCard key={exam._id} exam={exam} onAction={handleAction} />
                        ))}
                    </div>
                </section>
            )}

            {upcomingExams.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" size={20} />
                        Upcoming
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingExams.map(exam => (
                            <ExamCard key={exam._id} exam={exam} onAction={handleAction} />
                        ))}
                    </div>
                </section>
            )}

            {pastExams.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <RotateCcw className="text-slate-500" size={20} />
                        History
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pastExams.map(exam => (
                            <ExamCard key={exam._id} exam={exam} onAction={handleAction} />
                        ))}
                    </div>
                </section>
            )}

            {exams.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Exams Scheduled</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        You don't have any exams assigned to your batch at the moment.
                    </p>
                </div>
            )}
        </div>
    );
}

function ExamCard({ exam, onAction }) {
    const isActionable = ["available", "in_progress", "submitted", "evaluated"].includes(exam.submissionStatus);
    const isResume = exam.submissionStatus === "in_progress";

    // Safety check for scheduledAt
    const examDate = exam.scheduledAt ? new Date(exam.scheduledAt) : null;

    return (
        <Card className="hover:shadow-md transition-shadow border-slate-200">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                        <Badge className={`uppercase text-[10px] font-bold tracking-wider mb-2 ${exam.submissionStatus === "available" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                            exam.submissionStatus === "in_progress" ? "bg-orange-100 text-orange-700 hover:bg-orange-100" :
                                "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}>
                            {exam.submissionStatus.replace("_", " ")}
                        </Badge>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                            {exam.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                            {exam.course?.name || "General"} • {exam.duration} mins
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                        <Calendar size={14} className="mr-2 text-slate-400" />
                        {examDate ? format(examDate, "PPP") : "N/A"}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                        <Clock size={14} className="mr-2 text-slate-400" />
                        {examDate ? format(examDate, "p") : "N/A"}
                    </div>
                </div>

                {isActionable ? (
                    <Button
                        className={`w-full group ${isResume ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                            }`}
                        onClick={() => onAction(exam)}
                        variant={exam.submissionStatus === "evaluated" || exam.submissionStatus === "submitted" ? "outline" : "default"}
                    >
                        {isResume ? "Resume Exam" :
                            exam.submissionStatus === "available"
                                ? (exam.attemptsUsed > 0 ? "Retake Exam" : "Start Exam")
                                : "View Result"}
                        {exam.submissionStatus === "available" && <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                ) : (
                    <Button disabled className="w-full bg-slate-50 text-slate-400 border-slate-100">
                        {exam.submissionStatus === "missed" ? "Missed" : "Not Started"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
