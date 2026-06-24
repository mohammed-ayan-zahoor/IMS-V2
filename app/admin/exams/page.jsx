"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { Plus, Search, Filter, Trash2, Edit, FileText, Clock, CheckCircle, Settings, Layers, Archive, Monitor, FileSpreadsheet, Info, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

export default function ExamListPage() {
    const toast = useToast();
    const confirm = useConfirm();
    
    const [examMode, setExamMode] = useState("online"); // online, offline
    const [exams, setExams] = useState([]);
    const [offlineExams, setOfflineExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, closed
    const [search, setSearch] = useState("");
    const [showHelpModal, setShowHelpModal] = useState(false);

    const { selectedSessionId, loading: sessionLoading } = useAcademicSession();

    useEffect(() => {
        if (!sessionLoading) {
            fetchData();
        }
    }, [selectedSessionId, sessionLoading]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const onlineUrl = selectedSessionId 
                ? `/api/v1/exams?session=${selectedSessionId}` 
                : `/api/v1/exams`;
            
            const offlineUrl = selectedSessionId 
                ? `/api/v1/offline-exams?session=${selectedSessionId}` 
                : `/api/v1/offline-exams`;

            const [onlineRes, offlineRes] = await Promise.all([
                fetch(onlineUrl),
                fetch(offlineUrl)
            ]);
            const onlineData = await onlineRes.json();
            const offlineData = await offlineRes.json();
            setExams(onlineData.exams || []);
            setOfflineExams(offlineData.exams || []);
        } catch (error) {
            console.error("Failed to fetch exams", error);
            toast.error("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOnline = async (id) => {
        if (await confirm({ title: "Delete Exam?", message: "Are you sure you want to delete this online exam?", type: "danger" })) {
            try {
                const res = await fetch(`/api/v1/exams/${id}`, { method: "DELETE" });
                if (res.ok) {
                    setExams(exams.filter(e => e._id !== id));
                    toast.success("Exam deleted successfully");
                } else toast.error("Failed to delete exam");
            } catch (error) { toast.error("Error deleting exam"); }
        }
    };

    const handleDeleteOffline = async (id) => {
        if (await confirm({ title: "Delete Offline Exam?", message: "Are you sure you want to delete this offline exam?", type: "danger" })) {
            try {
                const res = await fetch(`/api/v1/offline-exams/${id}`, { method: "DELETE" });
                if (res.ok) {
                    setOfflineExams(offlineExams.filter(e => e._id !== id));
                    toast.success("Exam deleted successfully");
                } else toast.error("Failed to delete exam");
            } catch (error) { toast.error("Error deleting exam"); }
        }
    };

    // Filter Logic
    const filteredOnline = exams.filter(exam => {
        if (!exam.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (activeTab === "upcoming") return exam.status === 'draft' || exam.status === 'published';
        return exam.status === 'completed';
    });

    const filteredOffline = offlineExams.filter(exam => {
        if (!exam.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (activeTab === "upcoming") return exam.status === 'draft' || exam.status === 'marks_entry_open';
        return exam.status === 'published'; // For offline, 'published' means results are out (closed)
    });

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Examinations</h1>
                    <p className="text-slate-500">Manage both online assessments and offline school exams.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/exams/grading-scales">
                        <Button variant="outline" className="font-bold border-slate-200">
                            <Settings size={18} className="mr-2" /> Grading Scales
                        </Button>
                    </Link>
                    <Link href={examMode === "online" ? "/admin/exams/create" : "/admin/exams/offline/create"}>
                        <Button size="lg" className="shadow-lg shadow-premium-blue/20 font-bold">
                            <Plus size={20} className="mr-2" />
                            Create {examMode === "online" ? "Online" : "Offline"} Exam
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-4">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                        onClick={() => { setExamMode("online"); setActiveTab("upcoming"); }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${examMode === "online" ? "bg-white text-premium-blue shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <Monitor size={16} /> Online Exams
                    </button>
                    <button
                        onClick={() => { setExamMode("offline"); setActiveTab("upcoming"); }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${examMode === "offline" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <FileSpreadsheet size={16} /> Offline Exams
                    </button>
                </div>
                
                {examMode === "offline" && (
                    <Button variant="outline" size="sm" onClick={() => setShowHelpModal(true)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-full px-4">
                        <Info size={16} className="mr-2" /> How it works
                    </Button>
                )}
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex bg-slate-100/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "upcoming" ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                    >
                        Active / Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab("closed")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "closed" ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                    >
                        {examMode === "online" ? "Closed Exams" : "Results Published"}
                    </button>
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${examMode} exams...`}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-premium-blue/20 outline-none text-slate-700 font-medium h-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Exams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {examMode === "online" && filteredOnline.map(exam => (
                    <Card key={exam._id} className="group hover:border-premium-blue/30 transition-all hover:shadow-md flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl transition-colors ${exam.status === 'published' ? 'bg-green-50 text-green-600' :
                                exam.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                                }`}>
                                <Monitor size={24} />
                            </div>
                            <div className="flex gap-2">
                                <Badge variant={
                                    exam.status === 'published' ? 'success' :
                                        exam.status === 'draft' ? 'warning' : 'neutral'
                                }>
                                    {exam.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-premium-blue transition-colors">
                            {exam.title}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{exam.course?.name || "Unknown Course"}</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <Clock size={16} className="text-slate-400" />
                                <span>{exam.duration} mins</span>
                                <span className="text-slate-300 mx-1">•</span>
                                <span>{exam.totalMarks || 0} Marks</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <CheckCircle size={16} className="text-slate-400" />
                                <span>{exam.scheduledAt ? format(new Date(exam.scheduledAt), "MMM d, yyyy @ h:mm a") : "Unscheduled"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <Layers size={16} className="text-slate-400" />
                                <span>{exam.batches?.length || 0} Batches Assigned</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 mt-auto">
                            <Link href={`/admin/exams/${exam._id}/manage`} className="col-span-2">
                                <Button className="w-full font-bold bg-slate-800 hover:bg-slate-900 text-white">
                                    <Settings size={16} className="mr-2" />
                                    Manage Questions
                                </Button>
                            </Link>

                            {(exam.status === 'published' || exam.status === 'completed') && (
                                <Link href={`/admin/exams/${exam._id}/results`} className="col-span-2">
                                    <Button variant="outline" className="w-full font-bold text-premium-blue border-premium-blue/20 hover:bg-premium-blue/5">
                                        <Layers size={16} className="mr-2" />
                                        View Results
                                    </Button>
                                </Link>
                            )}

                            <Link href={`/admin/exams/${exam._id}`}>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Edit size={16} className="mr-2" />
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                                onClick={() => handleDeleteOnline(exam._id)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </Card>
                ))}

                {examMode === "offline" && filteredOffline.map(exam => (
                    <Card key={exam._id} className="group hover:border-emerald-600/30 transition-all hover:shadow-md flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl transition-colors ${exam.status === 'published' ? 'bg-indigo-50 text-indigo-600' :
                                exam.status === 'marks_entry_open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                                }`}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="flex gap-2">
                                <Badge variant={
                                    exam.status === 'published' ? 'success' :
                                        exam.status === 'marks_entry_open' ? 'success' : 'neutral'
                                }>
                                    {exam.status === 'marks_entry_open' ? 'ENTRY OPEN' : exam.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {exam.title}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{exam.course?.name || "Unknown Course"}</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <FileText size={16} className="text-slate-400" />
                                <span>{exam.subjects?.length || 0} Subjects</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <Layers size={16} className="text-slate-400" />
                                <span>{exam.batches?.length || 0} Batches Assigned</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <CheckCircle size={16} className="text-slate-400" />
                                <span>{exam.gradingScale ? exam.gradingScale.name : "Numeric Scoring Only"}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 mt-auto">
                            <Link href={`/admin/exams/offline/${exam._id}/marks`} className="col-span-2">
                                <Button className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <FileSpreadsheet size={16} className="mr-2" />
                                    Manage Marks
                                </Button>
                            </Link>

                            {exam.status === 'published' && (
                                <Link href={`/admin/exams/offline/${exam._id}/reports`} className="col-span-2">
                                    <Button variant="outline" className="w-full font-bold text-indigo-600 border-indigo-600/20 hover:bg-indigo-50">
                                        <FileText size={16} className="mr-2" />
                                        Report Cards
                                    </Button>
                                </Link>
                            )}

                            <Link href={`/admin/exams/offline/${exam._id}`}>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Edit size={16} className="mr-2" />
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                                onClick={() => handleDeleteOffline(exam._id)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </Card>
                ))}

                {((examMode === "online" && filteredOnline.length === 0) || (examMode === "offline" && filteredOffline.length === 0)) && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Archive size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No {activeTab} {examMode} exams found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {activeTab === 'upcoming'
                                ? `Get started by creating a new ${examMode} exam assessment.`
                                : "Closed exams will appear here once archived or published."}
                        </p>
                        {activeTab === 'upcoming' && (
                            <Link href={examMode === "online" ? "/admin/exams/create" : "/admin/exams/offline/create"}>
                                <Button size="lg" className="shadow-lg shadow-premium-blue/20">
                                    <Plus size={20} className="mr-2" />
                                    Create New Exam
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">How to use Offline Exams</h2>
                                <p className="text-sm text-slate-500">A quick guide to setting up and managing offline tests.</p>
                            </div>
                            <button onClick={() => setShowHelpModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 text-slate-700">
                            <div className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-premium-blue text-white flex items-center justify-center text-xs">1</div> Grading Scales (Optional)</h3>
                                <p className="pl-8 text-sm">If your school uses letter grades (A1, B2) based on percentage ranges, create a <strong>Grading Scale</strong> first using the button at the top right. Otherwise, the system will just use numeric marks.</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-premium-blue text-white flex items-center justify-center text-xs">2</div> Create Exam</h3>
                                <p className="pl-8 text-sm">Click <strong>Create Offline Exam</strong>. Give it a name like "Term 1", select the class, and add the subjects that will be tested along with their maximum marks.</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-premium-blue text-white flex items-center justify-center text-xs">3</div> Enter Marks</h3>
                                <p className="pl-8 text-sm">Once created, the exam will be in the <strong>ENTRY OPEN</strong> state. Click <strong>Manage Marks</strong> on the exam card. Select a batch, and enter marks for all students in the spreadsheet grid. You can toggle AB (Absent) or NA (Not Appeared).</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">4</div> Publish & Print Reports</h3>
                                <p className="pl-8 text-sm">When all marks are entered, go to the <strong>Manage Marks</strong> page and click <strong>Publish Results</strong>. This locks the marks so they can't be edited. You can then click <strong>Report Cards</strong> to view the class performance and print individual report cards.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 sticky bottom-0 flex justify-end">
                            <Button onClick={() => setShowHelpModal(false)}>Got it, thanks!</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
