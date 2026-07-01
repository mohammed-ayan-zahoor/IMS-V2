"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Printer, Lock, Unlock, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function OfflineExamReportsPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const { id: examId } = use(params);

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState("");
    const [resultsData, setResultsData] = useState([]);

    useEffect(() => {
        fetchExam();
    }, [examId]);

    useEffect(() => {
        if (selectedBatch) {
            fetchResults(selectedBatch);
        } else {
            setResultsData([]);
        }
    }, [selectedBatch]);

    const fetchExam = async () => {
        try {
            const res = await fetch(`/api/v1/offline-exams/${examId}`);
            if (res.ok) {
                const data = await res.json();
                setExam(data);
                if (data.batches && data.batches.length > 0) {
                    setSelectedBatch(data.batches[0]._id);
                }
            } else {
                toast.error("Failed to load exam details");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async (batchId) => {
        try {
            const res = await fetch(`/api/v1/offline-exams/${examId}/results?batch=${batchId}`);
            if (res.ok) {
                const data = await res.json();
                // Only show students who have a result document
                const actualResults = data.results.filter(r => r.resultId);
                
                // Sort by percentage descending for rank viewing
                actualResults.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
                setResultsData(actualResults);
            }
        } catch (error) {
            toast.error("Failed to load student results");
        }
    };

    const handlePublishToggle = async () => {
        const isPublishing = exam.status !== 'published';
        if (await confirm({
            title: isPublishing ? "Publish Results?" : "Unpublish Results?",
            message: isPublishing 
                ? "This will lock marks entry and make results visible in student portals (if enabled). Are you sure?" 
                : "This will unlock marks entry and hide results from students. Are you sure?",
            type: isPublishing ? "info" : "warning"
        })) {
            try {
                const newStatus = isPublishing ? 'published' : 'marks_entry_open';
                const res = await fetch(`/api/v1/offline-exams/${examId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus })
                });

                if (res.ok) {
                    toast.success(`Exam ${isPublishing ? 'published' : 'unpublished'} successfully!`);
                    fetchExam();
                } else {
                    toast.error("Failed to change status");
                }
            } catch (error) {
                toast.error("An error occurred");
            }
        }
    };

    const handlePrintReportCards = () => {
        // Trigger browser print for a specialized print-only CSS view.
        // In a real app, this might navigate to a /print layout or generate a PDF backend.
        window.print();
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!exam) return <div className="text-center p-12">Exam not found</div>;

    const isPublished = exam.status === 'published';

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 print:m-0 print:p-0 print:space-y-0">
            {/* NO-PRINT HEADER */}
            <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">{exam.title} - Reports</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={isPublished ? 'success' : 'warning'}>
                                {isPublished ? 'PUBLISHED' : 'DRAFT / ENTRY OPEN'}
                            </Badge>
                            <span className="text-xs text-slate-500">{exam.course?.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-64">
                        <Select
                            value={selectedBatch}
                            onChange={setSelectedBatch}
                            options={exam.batches?.map(b => ({ label: `Batch: ${b.name}`, value: b._id })) || []}
                        />
                    </div>
                    
                    <Button 
                        variant={isPublished ? "outline" : "default"}
                        onClick={handlePublishToggle}
                        className={!isPublished ? "shadow-lg shadow-premium-blue/25" : "border-rose-200 text-rose-600 hover:bg-rose-50"}
                    >
                        {isPublished ? <><Unlock size={16} className="mr-2"/> Unpublish</> : <><Lock size={16} className="mr-2"/> Publish Results</>}
                    </Button>
                    
                    <Button variant="outline" onClick={handlePrintReportCards} disabled={resultsData.length === 0} className="border-slate-200">
                        <Printer size={16} className="mr-2" /> Print Reports
                    </Button>
                </div>
            </div>

            {/* TABULAR VIEW (NO-PRINT) */}
            <div className="print:hidden">
                {!selectedBatch ? (
                    <Card className="p-12 text-center text-slate-500 border-dashed">Select a batch to view results.</Card>
                ) : resultsData.length === 0 ? (
                    <Card className="p-12 text-center text-slate-500 border-dashed">No marks entered for this batch yet.</Card>
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Roll No</th>
                                        <th className="px-4 py-3 text-center">Total Marks</th>
                                        <th className="px-4 py-3 text-center">Percentage</th>
                                        <th className="px-4 py-3 text-center">Grade</th>
                                        <th className="px-4 py-3 text-center">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultsData.map((result, idx) => (
                                        <tr key={result.student._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-slate-400">
                                                {exam.isRankEnabled ? `#${idx + 1}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-800">{result.student.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{result.student.rollNumber || '-'}</td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {result.totalObtained} / {exam.subjects.reduce((sum, s) => sum + s.maxMarks, 0)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-premium-blue">
                                                {result.percentage?.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-indigo-600">
                                                {result.overallGrade || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={result.overallResult === 'pass' ? 'success' : 'danger'}>
                                                    {result.overallResult.toUpperCase()}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* PRINTABLE REPORT CARDS */}
            <div className="hidden print:block space-y-12 bg-white">
                {resultsData.map((result, idx) => (
                    <div key={result.student._id} className="page-break-after-always h-screen pt-8 px-8">
                        <div className="border-4 border-double border-slate-800 p-8 h-full flex flex-col relative">
                            {/* Header */}
                            <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                                <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900 mb-2">Report Card</h1>
                                <h2 className="text-xl font-bold text-slate-700">{exam.title}</h2>
                                <p className="text-slate-500 font-medium mt-1">{exam.course?.name} | {exam.session?.name}</p>
                            </div>

                            {/* Student Info */}
                            <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <p className="text-sm text-slate-500">Student Name</p>
                                    <p className="font-bold text-lg text-slate-900">{result.student.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Roll / Enrollment Number</p>
                                    <p className="font-bold text-lg text-slate-900">{result.student.rollNumber || result.student.enrollmentNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Batch</p>
                                    <p className="font-bold text-lg text-slate-900">{exam.batches?.find(b => b._id === selectedBatch)?.name || '-'}</p>
                                </div>
                                {exam.isRankEnabled && (
                                    <div>
                                        <p className="text-sm text-slate-500">Class Rank</p>
                                        <p className="font-bold text-lg text-slate-900">#{idx + 1}</p>
                                    </div>
                                )}
                            </div>

                            {/* Marks Table */}
                            <div className="mb-8 flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-3">Scholastic Performance</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 p-2 font-bold text-slate-700">Subject</th>
                                            <th className="border border-slate-300 p-2 font-bold text-slate-700 text-center">Max Marks</th>
                                            <th className="border border-slate-300 p-2 font-bold text-slate-700 text-center">Passing</th>
                                            <th className="border border-slate-300 p-2 font-bold text-slate-700 text-center">Obtained</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exam.subjects.map(subConfig => {
                                            const markObj = result.marks.find(m => m.subject === subConfig.subject._id);
                                            let display = "-";
                                            if (markObj) {
                                                if (markObj.isAbsent) display = "AB";
                                                else if (markObj.isNotAppeared) display = "NA";
                                                else display = markObj.obtainedMarks;
                                            }

                                            return (
                                                <tr key={subConfig.subject._id}>
                                                    <td className="border border-slate-300 p-2 font-medium">{subConfig.subject.name}</td>
                                                    <td className="border border-slate-300 p-2 text-center text-slate-600">{subConfig.maxMarks}</td>
                                                    <td className="border border-slate-300 p-2 text-center text-slate-600">{subConfig.passingMarks}</td>
                                                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-900">{display}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Total Row */}
                                        <tr className="bg-slate-50">
                                            <td className="border border-slate-300 p-2 font-black text-right" colSpan={3}>GRAND TOTAL</td>
                                            <td className="border border-slate-300 p-2 text-center font-black text-lg">
                                                {result.totalObtained} / {exam.subjects.reduce((sum, s) => sum + s.maxMarks, 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Aggregates & Co-Scholastic */}
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-3">Overall Summary</h3>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr>
                                                <th className="border border-slate-300 p-2 bg-slate-50 w-1/2">Percentage</th>
                                                <td className="border border-slate-300 p-2 font-bold">{result.percentage?.toFixed(2)}%</td>
                                            </tr>
                                            {exam.gradingScale && (
                                                <tr>
                                                    <th className="border border-slate-300 p-2 bg-slate-50">Overall Grade</th>
                                                    <td className="border border-slate-300 p-2 font-bold text-indigo-600">{result.overallGrade || '-'}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <th className="border border-slate-300 p-2 bg-slate-50">Result</th>
                                                <td className={`border border-slate-300 p-2 font-black uppercase ${result.overallResult === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {result.overallResult}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {exam.coScholastic?.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3">Co-Scholastic Areas</h3>
                                        <table className="w-full text-left border-collapse">
                                            <tbody>
                                                {exam.coScholastic.map(co => {
                                                    const ratingObj = result.coScholasticRatings.find(c => c.paramName === co.paramName);
                                                    return (
                                                        <tr key={co.paramName}>
                                                            <th className="border border-slate-300 p-2 bg-slate-50 w-1/2 font-medium">{co.paramName}</th>
                                                            <td className="border border-slate-300 p-2 font-bold text-center">{ratingObj?.rating || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Remarks */}
                            {result.teacherRemarks && (
                                <div className="mb-12">
                                    <p className="text-sm font-bold text-slate-500 mb-1">Class Teacher Remarks:</p>
                                    <p className="p-3 border border-slate-200 rounded-lg italic text-slate-700 bg-slate-50/50">
                                        &quot;{result.teacherRemarks}&quot;
                                    </p>
                                </div>
                            )}

                            {/* Signatures */}
                            <div className="mt-auto grid grid-cols-3 gap-4 text-center pt-8 border-t border-slate-200">
                                <div>
                                    <div className="h-12"></div>
                                    <p className="border-t border-slate-400 pt-2 font-bold text-slate-700 mx-8">Class Teacher</p>
                                </div>
                                <div>
                                    <div className="h-12"></div>
                                    <p className="border-t border-slate-400 pt-2 font-bold text-slate-700 mx-8">Principal</p>
                                </div>
                                <div>
                                    <div className="h-12"></div>
                                    <p className="border-t border-slate-400 pt-2 font-bold text-slate-700 mx-8">Parent</p>
                                </div>
                            </div>
                        </div>
                        
                        <style jsx global>{`
                            @media print {
                                body * { visibility: hidden; }
                                .print\\:block, .print\\:block * { visibility: visible; }
                                .print\\:block {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                }
                                .page-break-after-always { page-break-after: always; }
                                @page { margin: 0; }
                            }
                        `}</style>
                    </div>
                ))}
            </div>
        </div>
    );
}
