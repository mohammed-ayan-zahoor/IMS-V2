"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { Plus, Search, Filter, Trash2, Edit, FileText, Clock, CheckCircle, Settings, Layers, Archive } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function ExamListPage() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, closed
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await fetch("/api/v1/exams");
            const data = await res.json();
            setExams(data.exams || []);
        } catch (error) {
            console.error("Failed to fetch exams", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this exam?")) return;

        try {
            const res = await fetch(`/api/v1/exams/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setExams(exams.filter(e => e._id !== id));
            } else {
                alert("Failed to delete exam");
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase());
        const isClosed = exam.status === 'completed' || (exam.scheduledAt && isPast(new Date(exam.scheduledAt)) && exam.status !== 'draft');

        // Tab Logic
        // Upcoming: Draft, Published (Future), Published (Recent Past?) -> Let's say Published is Upcoming unless marked Completed?
        // Actually user logic: "Online Exams" -> "Upcoming Exams" vs "Closed Exams"
        // Simplest: Closed = status 'completed' OR (status 'published' AND time passed > duration?)
        // Let's stick to status. Or simple date check.
        // Assuming 'completed' status is set manually or by system.
        // Re-reading user request: "Exams scheduled for now appear as missed".
        // Let's define Upcoming as: Draft OR Published (Future) OR Published (Active Now).
        // Closed as: Completed OR (Published AND Time+Duration Passed).

        // For simplicity in Admin Panel:
        // Upcoming = Draft or Published
        // Closed = Completed

        // OR Date based:
        // Upcoming = Scheduled >= Now OR Draft
        // Closed = Scheduled < Now AND Published/Completed

        let matchesTab = false;
        if (activeTab === "upcoming") {
            matchesTab = exam.status === 'draft' || exam.status === 'published';
            // Ideally we check if it is really old, but "Published" usually implies active.
        } else {
            matchesTab = exam.status === 'completed';
        }

        return matchesSearch && matchesTab;
    });

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Online Exams</h1>
                    <p className="text-slate-500">Create and manage assessments for courses.</p>
                </div>
                <Link href="/admin/exams/create">
                    <Button size="lg" className="shadow-lg shadow-premium-blue/20 font-bold">
                        <Plus size={20} className="mr-2" />
                        Create Exam
                    </Button>
                </Link>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex bg-slate-100/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "upcoming"
                            ? "bg-white text-premium-blue shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        Upcoming Exams
                    </button>
                    <button
                        onClick={() => setActiveTab("closed")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "closed"
                            ? "bg-white text-premium-blue shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        Closed Exams
                    </button>
                </div>

                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search exams..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-premium-blue/20 outline-none text-slate-700 font-medium h-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Exams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map(exam => (
                    <Card key={exam._id} className="group hover:border-premium-blue/30 transition-all hover:shadow-md flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl transition-colors ${exam.status === 'published' ? 'bg-green-50 text-green-600' :
                                exam.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                                }`}>
                                <FileText size={24} />
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
                            {/* Populate batches if possible or show count */}
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
                                    Edit Details
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                                onClick={() => handleDelete(exam._id)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </Card>
                ))}

                {filteredExams.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Archive size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No {activeTab} exams found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {activeTab === 'upcoming'
                                ? "Get started by creating a new exam assessment for your students."
                                : "Completed exams will appear here once archived."}
                        </p>
                        {activeTab === 'upcoming' && (
                            <Link href="/admin/exams/create">
                                <Button size="lg" className="shadow-lg shadow-premium-blue/20">
                                    <Plus size={20} className="mr-2" />
                                    Create New Exam
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
