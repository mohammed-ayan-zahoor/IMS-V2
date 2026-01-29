"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Download, Trophy, Users, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Drawer from "@/components/ui/Drawer";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ExamResultsPage({ params }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [search, setSearch] = useState("");

    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [detailedResult, setDetailedResult] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [drawerError, setDrawerError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [examRes, subRes] = await Promise.all([
                fetch(`/api/v1/exams/${id}`),
                fetch(`/api/v1/exams/${id}/submissions`)
            ]);

            const examData = await examRes.json();
            const subData = await subRes.json();

            setExam(examData.exam);
            setSubmissions(subData.submissions || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetails = async (submissionId) => {
        setDrawerLoading(true);
        setDrawerError(null);
        setDetailedResult(null);
        setSelectedSubmissionId(submissionId);
        setIsDrawerOpen(true);

        try {
            const res = await fetch(`/api/v1/exams/submissions/${submissionId}/admin-result`);
            if (!res.ok) throw new Error("Failed to fetch detailed results");

            const data = await res.json();
            setDetailedResult(data);
        } catch (error) {
            console.error("Error fetching student details:", error);
            setDrawerError("Failed to load detailed results. Please try again.");
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedSubmissionId(null);
        setDetailedResult(null);
        setDrawerError(null);
    };

    const filteredSubmissions = submissions.filter(s =>
        s.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.student?.email?.toLowerCase().includes(search.toLowerCase())
    );

    // Calc Stats
    const totalSubmissions = submissions.length;
    const avgScore = totalSubmissions > 0
        ? (submissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalSubmissions).toFixed(1)
        : 0;
    const maxScore = totalSubmissions > 0
        ? Math.max(...submissions.map(s => s.score || 0))
        : 0;

    if (loading) return <LoadingSpinner fullPage />;
    if (!exam) return <div className="p-10 text-center">Exam not found</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/admin/exams")} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{exam.title} Results</h1>
                        <p className="text-slate-500">Student performance overview.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {/* Export/Download placeholders could go here */}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Attempts</p>
                        <p className="text-2xl font-black text-slate-900">{totalSubmissions}</p>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
                        <p className="text-2xl font-black text-slate-900">{avgScore} <span className="text-sm text-slate-400 font-bold">/ {exam.totalMarks}</span></p>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
                        <p className="text-2xl font-black text-slate-900">
                            {totalSubmissions > 0 ? Math.round((submissions.filter(s => s.status === 'evaluated').length / totalSubmissions) * 100) : 0}%
                        </p>
                    </div>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search student name or email..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-premium-blue/20 outline-none text-slate-700 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Score</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Percentage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No submissions found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((sub) => (
                                    <tr key={sub._id} onClick={() => fetchStudentDetails(sub._id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-premium-blue/10 text-premium-blue flex items-center justify-center font-bold text-xs uppercase">
                                                    {sub.student?.fullName?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{sub.student?.fullName || "Unknown User"}</p>
                                                    <p className="text-xs text-slate-400">{sub.student?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {sub.submittedAt ? format(new Date(sub.submittedAt), "MMM d, h:mm a") : "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={sub.status === 'evaluated' ? 'success' : sub.status === 'submitted' ? 'warning' : 'neutral'}>
                                                {sub.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-slate-900">{sub.score}</span>
                                            <span className="text-slate-400 text-xs ml-1">/ {exam.totalMarks}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold ${sub.percentage >= 40 ? "text-green-600" : "text-red-500"}`}>
                                                {sub.percentage?.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Drawer for Detailed Results */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                title={detailedResult ? `${detailedResult.student?.fullName || "Student"}'s Results` : "Student Results"}
            >
                {drawerLoading && (
                    <div className="flex items-center justify-center py-20">
                        <LoadingSpinner />
                    </div>
                )}

                {drawerError && (
                    <div className="text-center py-10">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-slate-700 font-medium">{drawerError}</p>
                        <Button onClick={handleCloseDrawer} className="mt-4">Close</Button>
                    </div>
                )}

                {!drawerLoading && !drawerError && detailedResult && (
                    <div className="space-y-6">
                        {/* Score Summary */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Student</p>
                                    <p className="text-xl font-bold text-slate-900">{detailedResult.student?.fullName}</p>
                                    <p className="text-sm text-slate-400">{detailedResult.student?.email}</p>
                                    {detailedResult.student?.enrollmentNumber && (
                                        <p className="text-xs text-slate-400 mt-1">ID: {detailedResult.student.enrollmentNumber}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                                    <div className="text-3xl font-black text-slate-900">
                                        {detailedResult.submission?.score ?? 0} <span className="text-lg text-slate-400 font-bold">/ {detailedResult.exam?.totalMarks ?? 0}</span>
                                    </div>
                                    <div className={cn(
                                        "text-2xl font-black mt-1",
                                        (detailedResult.submission?.percentage ?? 0) >= 40 ? "text-green-600" : "text-red-500"
                                    )}>
                                        {(detailedResult.submission?.percentage ?? 0).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Analysis */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Detailed Analysis</h3>
                            {(detailedResult.submission?.answers ?? []).map((ans, idx) => {
                                const isCorrect = ans.isCorrect;
                                const isSkipped = ans.yourAnswer === "" || ans.yourAnswer === undefined || ans.yourAnswer === null;

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
                                                        <p className="font-semibold text-slate-800 text-base mb-4">
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
                                                                    <span className="block text-xs font-bold opacity-60 mb-1 uppercase">Student's Answer</span>
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
            </Drawer>
        </div>
    );
}
