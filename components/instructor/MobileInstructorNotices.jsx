"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Tag, User } from "lucide-react";
import MobileBottomSheet from "@/components/mobile/MobileBottomSheet";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";

export default function MobileInstructorNotices() {
    const toast = useToast();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isNoticeSheetOpen, setIsNoticeSheetOpen] = useState(false);
    const [noticeForm, setNoticeForm] = useState({ title: "", content: "", category: "GENERAL" });
    const [postingNotice, setPostingNotice] = useState(false);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/notices");
            if (res.ok) {
                const data = await res.json();
                setNotices(data.notices || []);
            }
        } catch (e) {
            console.error("Failed to fetch notices", e);
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
                fetchNotices();
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

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </span>
                        <h1 className="text-base font-bold text-white">Notices & Announcements</h1>
                    </div>

                    <button
                        onClick={() => setIsNoticeSheetOpen(true)}
                        className="bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-none"
                    >
                        <Plus size={14} /> Post Notice
                    </button>
                </div>
            </div>

            {/* Notice List Feed */}
            {loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading notices...
                </div>
            ) : notices.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <Megaphone size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Notices Published</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tap "+ Post Notice" to publish announcements to students.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notices.map((n) => (
                        <div 
                            key={n._id}
                            className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="text-xs font-bold text-slate-900 leading-snug">{n.title}</h3>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                                    {n.category || 'GENERAL'}
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 font-normal leading-relaxed">
                                {n.content}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                                <span className="flex items-center gap-1">
                                    <User size={11} /> {n.author?.profile?.firstName || 'Staff'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} /> {n.createdAt ? format(new Date(n.createdAt), 'MMM d, yyyy') : ''}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notice Creation Bottom Sheet */}
            <MobileBottomSheet
                isOpen={isNoticeSheetOpen}
                onClose={() => setIsNoticeSheetOpen(false)}
                title="Post Announcement"
                subtitle="Broadcast notice to students"
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
