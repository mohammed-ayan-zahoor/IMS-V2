"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
    UserCheck, 
    Calendar, 
    Megaphone, 
    FileText, 
    Users, 
    Layers3, 
    ChevronRight, 
    BookOpen,
    ArrowRight
} from "lucide-react";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useToast } from "@/contexts/ToastContext";
import MobileBottomSheet from "@/components/mobile/MobileBottomSheet";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function InstructorMobileDashboard() {
    const { data: session } = useSession();
    const { selectedSessionId } = useAcademicSession();
    const toast = useToast();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalBatches: 0,
        noticesCount: 0
    });

    // Mobile Notice Sheet State
    const [isNoticeSheetOpen, setIsNoticeSheetOpen] = useState(false);
    const [noticeForm, setNoticeForm] = useState({ title: "", content: "", category: "GENERAL" });
    const [postingNotice, setPostingNotice] = useState(false);

    useEffect(() => {
        fetchInstructorData();
    }, [selectedSessionId]);

    const fetchInstructorData = async () => {
        try {
            setLoading(true);
            const [batchRes, statsRes] = await Promise.all([
                fetch("/api/v1/batches"),
                fetch("/api/v1/dashboard/stats")
            ]);

            if (batchRes.ok) {
                const bData = await batchRes.json();
                setBatches(bData.batches || []);
            }

            if (statsRes.ok) {
                const sData = await statsRes.json();
                setStats({
                    totalStudents: sData.totalStudents || sData.overview?.totalStudents || 0,
                    totalBatches: sData.totalBatches || sData.overview?.totalBatches || 0,
                    noticesCount: sData.noticesCount || 0
                });
            }
        } catch (err) {
            console.error("Mobile Instructor Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        try {
            setPostingNotice(true);
            const res = await fetch("/api/v1/notices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: noticeForm.title,
                    content: noticeForm.content,
                    category: noticeForm.category,
                    targetRole: "ALL"
                })
            });

            if (res.ok) {
                toast.success("Notice published!");
                setIsNoticeSheetOpen(false);
                setNoticeForm({ title: "", content: "", category: "GENERAL" });
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to publish notice");
            }
        } catch (e) {
            toast.error("Network error creating notice");
        } finally {
            setPostingNotice(false);
        }
    };

    const teacherName = session?.user?.name || "Teacher";
    const todayFormatted = new Date().toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });

    return (
        <div className="space-y-4 pb-6 pt-1">
            {/* Flat Professional Teacher Header */}
            <div className="bg-slate-900 text-white rounded-lg p-4 border border-slate-800 shadow-none">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </p>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            {teacherName}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {todayFormatted}
                        </p>
                    </div>

                    <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                        {teacherName[0]}
                    </div>
                </div>

                {/* Flat Stats Strip */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
                    <div className="bg-slate-800/80 rounded-md p-2 border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Assigned</p>
                        <p className="text-sm font-bold text-white mt-0.5">{batches.length}</p>
                        <p className="text-[9px] text-slate-400">{isSchool ? 'Sections' : 'Batches'}</p>
                    </div>
                    <div className="bg-slate-800/80 rounded-md p-2 border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Students</p>
                        <p className="text-sm font-bold text-white mt-0.5">{stats.totalStudents || '-'}</p>
                        <p className="text-[9px] text-slate-400">Enrolled</p>
                    </div>
                    <div className="bg-slate-800/80 rounded-md p-2 border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Session</p>
                        <p className="text-sm font-bold text-emerald-400 mt-0.5">Active</p>
                        <p className="text-[9px] text-slate-400">Current</p>
                    </div>
                </div>
            </div>

            {/* Flat Quick Action Buttons (2x2 Grid) */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-0.5">
                    Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        href="/admin/attendance"
                        className="bg-white hover:bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 transition-colors shadow-none"
                    >
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                            <UserCheck size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">Attendance</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">Mark Students</p>
                        </div>
                    </Link>

                    <button
                        onClick={() => setIsNoticeSheetOpen(true)}
                        className="bg-white hover:bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 text-left transition-colors shadow-none"
                    >
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                            <Megaphone size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">Notice</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">Post Update</p>
                        </div>
                    </button>

                    <Link
                        href="/admin/materials"
                        className="bg-white hover:bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 transition-colors shadow-none"
                    >
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">Materials</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">Upload Notes</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/batches"
                        className="bg-white hover:bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 transition-colors shadow-none"
                    >
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                            <Layers3 size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                                My {isSchool ? 'Sections' : 'Batches'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">Assigned List</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Flat Assigned Classes Feed */}
            <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center px-0.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Assigned {isSchool ? 'Sections' : 'Batches'} ({batches.length})
                    </h3>
                    <Link href="/admin/batches" className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-0.5">
                        View All <ChevronRight size={14} />
                    </Link>
                </div>

                {loading ? (
                    <div className="bg-white p-4 rounded-lg border border-slate-200 text-center text-slate-400 text-xs font-medium">
                        Loading...
                    </div>
                ) : batches.length === 0 ? (
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                        <BookOpen size={20} className="text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">No Assigned {isSchool ? 'Sections' : 'Batches'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Contact school administrator to assign classes.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {batches.map((batch) => (
                            <div 
                                key={batch._id}
                                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                            >
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">{batch.name}</h4>
                                    <p className="text-[11px] text-slate-500 font-medium truncate">
                                        {batch.course?.name || "Course"} • {(batch.students || []).length} Students
                                    </p>
                                </div>

                                <Link
                                    href={`/admin/attendance?batchId=${batch._id}`}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                                >
                                    <UserCheck size={14} /> Attendance
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Flat Slide-Up Mobile Notice Sheet */}
            <MobileBottomSheet
                isOpen={isNoticeSheetOpen}
                onClose={() => setIsNoticeSheetOpen(false)}
                title="Post Notice"
                subtitle="Send notice to students"
            >
                <form onSubmit={handleCreateNotice} className="space-y-3 pt-1">
                    <Input
                        label="Notice Title *"
                        required
                        placeholder="e.g. Revision Test Tomorrow"
                        value={noticeForm.title}
                        onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    />

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Category</label>
                        <select
                            value={noticeForm.category}
                            onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-bold text-slate-800 bg-white"
                        >
                            <option value="GENERAL">General</option>
                            <option value="EXAM">Exam / Test</option>
                            <option value="HOLIDAY">Holiday</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Message *</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Write notice details..."
                            value={noticeForm.content}
                            onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsNoticeSheetOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={postingNotice}>
                            {postingNotice ? "Publishing..." : "Publish Notice"}
                        </Button>
                    </div>
                </form>
            </MobileBottomSheet>
        </div>
    );
}
