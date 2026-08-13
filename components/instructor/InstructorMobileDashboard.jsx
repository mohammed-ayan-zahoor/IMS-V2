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
    Clock, 
    CheckCircle2, 
    ChevronRight, 
    Sparkles, 
    Plus,
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
                toast.success("Notice published to students!");
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
        <div className="space-y-5 pb-8 pt-2">
            {/* Greeting Header Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-5 shadow-xl border border-indigo-700/40 relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] w-36 h-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1 mb-1">
                                <Sparkles size={12} /> Welcome Back
                            </span>
                            <h1 className="text-2xl font-black tracking-tight text-white">
                                {teacherName}
                            </h1>
                            <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                                {todayFormatted} • Ready for today's classes
                            </p>
                        </div>

                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-black text-indigo-200 text-sm shadow-inner">
                            {teacherName[0]}
                        </div>
                    </div>

                    {/* Stats pills in header */}
                    <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-indigo-700/40">
                        <div className="bg-indigo-950/40 rounded-2xl p-2.5 text-center border border-indigo-700/30">
                            <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Assigned</p>
                            <p className="text-base font-black text-white mt-0.5">{batches.length}</p>
                            <p className="text-[9px] text-indigo-300/70 font-medium">{isSchool ? 'Sections' : 'Batches'}</p>
                        </div>
                        <div className="bg-indigo-950/40 rounded-2xl p-2.5 text-center border border-indigo-700/30">
                            <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Students</p>
                            <p className="text-base font-black text-white mt-0.5">{stats.totalStudents || '-'}</p>
                            <p className="text-[9px] text-indigo-300/70 font-medium">Total Enrolled</p>
                        </div>
                        <div className="bg-indigo-950/40 rounded-2xl p-2.5 text-center border border-indigo-700/30">
                            <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Session</p>
                            <p className="text-base font-black text-white mt-0.5">Active</p>
                            <p className="text-[9px] text-indigo-300/70 font-medium">Current Term</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Grid (4 Large Tap Buttons) */}
            <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/admin/attendance"
                        className="bg-white hover:bg-emerald-50/50 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-28 group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Mark Attendance</p>
                            <p className="text-[11px] text-slate-400 font-medium">1-Tap Student Tally</p>
                        </div>
                    </Link>

                    <button
                        onClick={() => setIsNoticeSheetOpen(true)}
                        className="bg-white hover:bg-indigo-50/50 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-28 text-left group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Post Announcement</p>
                            <p className="text-[11px] text-slate-400 font-medium">Notify Class Students</p>
                        </div>
                    </button>

                    <Link
                        href="/admin/materials"
                        className="bg-white hover:bg-amber-50/50 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-28 group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            <FileText size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Study Materials</p>
                            <p className="text-[11px] text-slate-400 font-medium">Upload Notes & Tasks</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/batches"
                        className="bg-white hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-28 group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            <Layers3 size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                My {isSchool ? 'Sections' : 'Batches'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">Assigned Classes</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Assigned Classes Mobile Section List */}
            <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        My Assigned {isSchool ? 'Sections' : 'Batches'} ({batches.length})
                    </h3>
                    <Link href="/admin/batches" className="text-xs font-bold text-indigo-600 flex items-center gap-0.5">
                        View All <ChevronRight size={14} />
                    </Link>
                </div>

                {loading ? (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 text-sm font-medium">
                        Loading assigned classes...
                    </div>
                ) : batches.length === 0 ? (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                        <BookOpen size={24} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No Assigned {isSchool ? 'Sections' : 'Batches'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Contact school admin to assign your classes.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {batches.slice(0, 4).map((batch) => (
                            <div 
                                key={batch._id}
                                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                        {batch.name?.[0] || "S"}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">{batch.name}</h4>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {batch.course?.name || "Course"} • {(batch.students || []).length} Students
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href={`/admin/attendance?batchId=${batch._id}`}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                                >
                                    <UserCheck size={14} /> Take Attendance
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Slide-Up Mobile Notice Posting Sheet */}
            <MobileBottomSheet
                isOpen={isNoticeSheetOpen}
                onClose={() => setIsNoticeSheetOpen(false)}
                title="Post Announcement"
                subtitle="Broadcast notice to all students in your classes"
            >
                <form onSubmit={handleCreateNotice} className="space-y-4 pt-2">
                    <Input
                        label="Announcement Title *"
                        required
                        placeholder="e.g. Tomorrow Homework & Revision Test"
                        value={noticeForm.title}
                        onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    />

                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Category</label>
                        <select
                            value={noticeForm.category}
                            onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-white"
                        >
                            <option value="GENERAL">General Notice</option>
                            <option value="EXAM">Exam / Test Update</option>
                            <option value="HOLIDAY">Holiday / Event</option>
                            <option value="URGENT">Urgent Announcement</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Content / Message *</label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Write your notice details here..."
                            value={noticeForm.content}
                            onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
