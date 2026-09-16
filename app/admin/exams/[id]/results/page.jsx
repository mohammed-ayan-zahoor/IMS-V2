"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Download, Trophy, Users, Clock, AlertCircle, CheckCircle2, XCircle, Printer, ClipboardList, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Drawer from "@/components/ui/Drawer";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

export default function ExamResultsPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();

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

    const handlePrintReportCard = async () => {
        try {
            // Fetch institute details for branding
            const instRes = await fetch("/api/v1/institute");
            let instituteData = null;
            if (instRes.ok) {
                const data = await instRes.json();
                instituteData = data.institute;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error("Please allow popups to print report card");
                return;
            }

            // Data prep
            const student = detailedResult?.student || {};
            const submission = detailedResult?.submission || {};
            const currentExam = detailedResult?.exam || exam || {};
            const answers = submission.answers || [];
            
            const isPass = (submission.percentage ?? 0) >= 40;

            const escapeHtml = (unsafe) => {
                if (unsafe === null || unsafe === undefined) return "";
                return String(unsafe)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${escapeHtml(student.fullName || 'Student')} - Report Card</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
                        .report-container { max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; padding: 40px; }
                        
                        .header { display: flex; align-items: center; justify-content: center; border-bottom: 3px solid #0f172a; padding-bottom: 30px; margin-bottom: 30px; }
                        .logo { max-height: 80px; max-width: 180px; margin-right: 30px; }
                        .institute-info { text-align: left; }
                        .institute-name { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        
                        .report-title { text-align: center; font-size: 22px; font-weight: 800; margin-bottom: 40px; color: #1e293b; text-transform: uppercase; letter-spacing: 2px; text-decoration: underline; }
                        
                        .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
                        .info-row { display: flex; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
                        .info-label { font-size: 13px; text-transform: uppercase; color: #475569; font-weight: bold; width: 140px; }
                        .info-value { font-size: 15px; font-weight: 700; color: #0f172a; }
                        
                        .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        .marks-table th, .marks-table td { border: 2px solid #0f172a; padding: 15px; text-align: center; }
                        .marks-table th { background-color: #f8fafc; font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 14px; }
                        .marks-table td { font-size: 18px; font-weight: 700; color: #1e293b; }
                        
                        .marks-table .subject-col { text-align: left; font-size: 16px; text-transform: uppercase; }
                        
                        .result-summary { display: flex; justify-content: space-around; border: 2px solid #0f172a; padding: 20px; background-color: #f8fafc; margin-bottom: 60px; }
                        .summary-item { text-align: center; }
                        .summary-label { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
                        .summary-value { font-size: 24px; font-weight: 900; color: #0f172a; }
                        
                        .text-green { color: #16a34a; }
                        .text-red { color: #dc2626; }
                        
                        .signatures { display: flex; justify-content: space-between; margin-top: 80px; padding: 0 40px; }
                        .sig-line { width: 200px; border-top: 1px solid #0f172a; text-align: center; padding-top: 10px; font-weight: bold; font-size: 14px; color: #0f172a; }
                        
                        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
                        
                        @media print {
                            @page { margin: 1cm; size: A4 portrait; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <div class="header">
                            ${instituteData?.branding?.logo ? `<img src="${instituteData.branding.logo}" alt="Logo" class="logo" />` : ''}
                            <div class="institute-info">
                                <h1 class="institute-name">${escapeHtml(instituteData?.name || 'Institute Name')}</h1>
                                <div style="font-size: 14px; color: #475569; margin-top: 5px;">
                                    ${escapeHtml(instituteData?.address?.street || '')} ${escapeHtml(instituteData?.address?.city || '')} 
                                </div>
                            </div>
                        </div>
                        
                        <div class="report-title">STATEMENT OF MARKS</div>
                        
                        <div class="student-grid">
                            <div>
                                <div class="info-row">
                                    <div class="info-label">Candidate Name</div>
                                    <div class="info-value">${escapeHtml(student.fullName || '-')}</div>
                                </div>
                                <div class="info-row" style="margin-top: 15px;">
                                    <div class="info-label">Registration No.</div>
                                    <div class="info-value">${escapeHtml(student.enrollmentNumber || '-')}</div>
                                </div>
                            </div>
                            <div>
                                <div class="info-row">
                                    <div class="info-label">Examination</div>
                                    <div class="info-value">${escapeHtml(currentExam.title || '-')}</div>
                                </div>
                                <div class="info-row" style="margin-top: 15px;">
                                    <div class="info-label">Date</div>
                                    <div class="info-value">${submission.submittedAt ? format(new Date(submission.submittedAt), "dd MMM yyyy") : '-'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <table class="marks-table">
                            <thead>
                                <tr>
                                    <th class="subject-col">Subject / Assessment</th>
                                    <th>Maximum Marks</th>
                                    <th>Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="subject-col">${escapeHtml(currentExam.subject?.name || currentExam.title || 'General Assessment')}</td>
                                    <td>${currentExam.totalMarks ?? 0}</td>
                                    <td>${submission.score ?? 0}</td>
                                </tr>
                                <tr style="border-top: 2px solid #0f172a; background-color: #f8fafc;">
                                    <td class="subject-col" style="text-align: right; font-weight: 900;">GRAND TOTAL</td>
                                    <td style="font-weight: 900;">${currentExam.totalMarks ?? 0}</td>
                                    <td style="font-weight: 900;">${submission.score ?? 0}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="result-summary">
                            <div class="summary-item">
                                <div class="summary-label">Percentage</div>
                                <div class="summary-value">${(submission.percentage ?? 0).toFixed(2)}%</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">Final Result</div>
                                <div class="summary-value ${isPass ? 'text-green' : 'text-red'}">${isPass ? 'PASS' : 'FAIL'}</div>
                            </div>
                        </div>
                        
                        <div class="signatures">
                            <div class="sig-line">Candidate's Signature</div>
                            <div class="sig-line">Authorized Signatory</div>
                        </div>
                        
                        <div class="footer">
                            <p>This is a computer generated document. Date of Issue: ${escapeHtml(format(new Date(), "PP"))}</p>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { setTimeout(() => { window.print(); }, 500); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            
        } catch (error) {
            console.error("Print failed", error);
            toast.error("Failed to generate print view");
        }
    };

     if (loading) return <LoadingSpinner fullPage />;
     if (!exam) return <div className="p-10 text-center">Exam not found</div>;
 
      return (
          <>
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
                  <div className="flex items-center gap-3">
                      <Button
                          onClick={() => router.push(`/admin/exams/${id}/grade`)}
                          className="font-bold flex items-center gap-2"
                      >
                          <ClipboardList size={16} />
                          Grade Answers
                          {submissions.some(s => s.status === 'submitted' || s.gradingStatus === 'pending') && (
                              <span className="bg-amber-400 text-slate-900 text-xs px-1.5 py-0.5 rounded-full font-black">
                                  {submissions.filter(s => s.status === 'submitted' || s.gradingStatus === 'pending').length}
                              </span>
                          )}
                      </Button>
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
                                    <tr
                                        key={sub._id}
                                        onClick={() => fetchStudentDetails(sub._id)}
                                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fetchStudentDetails(sub._id)}
                                        tabIndex={0}
                                        role="button"
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-premium-blue/20"
                                    >
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
                 <div className="flex justify-end space-x-2 mb-4">
                     <Button
                         variant="outline"
                         size="icon"
                         onClick={handlePrintReportCard}
                         title="Print Report Card"
                     >
                         <Printer size={20} />
                     </Button>
                 </div>
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
                                const isSkipped = ans.yourAnswer === "" || ans.yourAnswer === undefined || ans.yourAnswer === null;
                                const marksAwarded = Number(ans.marksAwarded ?? 0);
                                const maxMarks = Number(ans.maxMarks ?? 0);
                                const isFull = !ans.needsGrading && !isSkipped && (ans.isCorrect || (marksAwarded >= maxMarks && maxMarks > 0));
                                const isPartial = !ans.needsGrading && !isSkipped && (marksAwarded > 0 && marksAwarded < maxMarks);
                                const isZero = !ans.needsGrading && !isSkipped && marksAwarded === 0;

                                return (
                                    <Card key={idx} className={cn(
                                        "border transition-all",
                                        ans.needsGrading ? "border-amber-200 bg-amber-50/20" :
                                        isFull ? "border-green-200 bg-green-50/20" :
                                        isPartial ? "border-amber-200 bg-amber-50/20" :
                                        isSkipped ? "border-slate-200 bg-slate-50/50" : "border-red-200 bg-red-50/20"
                                    )}>
                                        <CardContent className="p-6">
                                            <div className="flex gap-4">
                                                <div className="shrink-0 pt-1">
                                                    {ans.needsGrading ? (
                                                        <Clock className="text-amber-500 animate-pulse" size={24} />
                                                    ) : isFull ? (
                                                        <CheckCircle2 className="text-green-500" size={24} />
                                                    ) : isPartial ? (
                                                        <CheckCircle2 className="text-amber-500" size={24} />
                                                    ) : isSkipped ? (
                                                        <AlertCircle className="text-slate-400" size={24} />
                                                    ) : (
                                                        <XCircle className="text-red-500" size={24} />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                    Question {idx + 1}
                                                                </span>
                                                                {ans.type && (
                                                                    <span className="text-[10px] uppercase font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                                        {ans.type.replace(/_/g, ' ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "text-xs font-bold px-2.5 py-1 rounded",
                                                                ans.needsGrading ? "bg-amber-100 text-amber-800" :
                                                                isFull ? "bg-green-100 text-green-700" :
                                                                isPartial ? "bg-amber-100 text-amber-800" :
                                                                isSkipped ? "bg-slate-100 text-slate-600" :
                                                                "bg-red-100 text-red-700"
                                                            )}>
                                                                {ans.needsGrading ? "Pending Evaluation" : `${marksAwarded} / ${maxMarks} Marks${isPartial ? ' · Partial' : isSkipped ? ' · Skipped' : ''}`}
                                                            </span>
                                                        </div>
                                                        <p className="font-semibold text-slate-800 text-base mb-4">
                                                            {ans.questionText}
                                                        </p>

                                                        {/* Diagram image if any */}
                                                        {ans.questionImage && (
                                                            <div className="mb-4 max-w-md rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                                                <img
                                                                    src={ans.questionImage}
                                                                    alt="Question Diagram"
                                                                    className="w-full h-auto max-h-72 object-contain p-2"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* MCQ / Multi-Correct options */}
                                                        {(ans.type === "mcq" || ans.type === "multi_correct_mcq") && ans.options && (
                                                            <div className="grid gap-2">
                                                                {ans.options.map((option, optIdx) => {
                                                                    let isUserSelected = false;
                                                                    let isCorrectOption = false;

                                                                    if (ans.type === "multi_correct_mcq") {
                                                                        try {
                                                                            const sArr = JSON.parse(ans.yourAnswer || '[]');
                                                                            const cArr = JSON.parse(ans.correctAnswer || '[]');
                                                                            isUserSelected = sArr.includes(optIdx);
                                                                            isCorrectOption = cArr.includes(optIdx);
                                                                        } catch {}
                                                                    } else {
                                                                        isUserSelected = parseInt(ans.yourAnswer, 10) === optIdx;
                                                                        isCorrectOption = parseInt(ans.correctAnswer, 10) === optIdx;
                                                                    }

                                                                    let optionStyle = "bg-white border-slate-200 text-slate-700";
                                                                    let icon = null;

                                                                    if (isCorrectOption) {
                                                                        optionStyle = "bg-green-100 border-green-300 text-green-800 font-medium";
                                                                        icon = <CheckCircle2 size={16} className="text-green-600" />;
                                                                    } else if (isUserSelected && !isFull) {
                                                                        optionStyle = "bg-red-50 border-red-200 text-red-800";
                                                                        icon = <XCircle size={16} className="text-red-500" />;
                                                                    } else if (isUserSelected && isFull) {
                                                                        optionStyle = "bg-green-100 border-green-300 text-green-800 font-medium";
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

                                                        {/* Non-MCQ Types (Short Answer, Essay, Descriptive, Numerical, Fill in Blank, etc.) */}
                                                        {ans.type !== "mcq" && ans.type !== "multi_correct_mcq" && (
                                                            <div className="space-y-3">
                                                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                                                    <div className="p-3.5 rounded-lg border bg-white border-slate-200 text-slate-800 shadow-sm">
                                                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                                                            Student&apos;s Answer
                                                                        </span>
                                                                        <p className="whitespace-pre-wrap font-medium">
                                                                            {ans.yourAnswer || <span className="italic text-slate-400">No answer provided (Skipped)</span>}
                                                                        </p>
                                                                    </div>
                                                                    {(ans.modelAnswer || ans.correctAnswer) && (
                                                                        <div className="p-3.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 shadow-sm">
                                                                            <span className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
                                                                                {ans.modelAnswer ? "Model / Reference Answer" : "Correct Answer Note"}
                                                                            </span>
                                                                            <p className="whitespace-pre-wrap font-medium">
                                                                                {ans.modelAnswer || ans.correctAnswer}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Evaluator Feedback */}
                                                                {ans.feedback && (
                                                                    <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-sm shadow-sm">
                                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
                                                                            <MessageSquare size={14} />
                                                                            <span>Evaluator Feedback</span>
                                                                        </div>
                                                                        <p className="whitespace-pre-wrap font-medium text-purple-950">
                                                                            {ans.feedback}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* Rubric if available */}
                                                                {ans.rubric && (
                                                                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 text-xs">
                                                                        <span className="block font-bold text-amber-700 uppercase tracking-wider mb-1">
                                                                            Grading Rubric
                                                                        </span>
                                                                        <p className="whitespace-pre-wrap">{ans.rubric}</p>
                                                                    </div>
                                                                )}

                                                                {/* Explanation if available */}
                                                                {ans.explanation && (
                                                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                                                                        <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                                            Explanation
                                                                        </span>
                                                                        <p className="whitespace-pre-wrap">{ans.explanation}</p>
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
          </>
       );
 }
