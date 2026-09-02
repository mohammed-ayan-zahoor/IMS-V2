"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    Megaphone, 
    Pin, 
    Clock, 
    AlertTriangle,
    Info,
    Calendar,
    CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import MobileInstructorNotices from "@/components/instructor/MobileInstructorNotices";

export default function AdminNoticesPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            title: "",
            content: "",
            type: "info",
            target: "all",
            targetIds: [],
            isPinned: false,
            isActive: true,
            expiresAt: ""
        };
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [nRes, cRes, bRes] = await Promise.all([
                fetch("/api/v1/notices"),
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);
            const nData = await nRes.json();
            const cData = await cRes.json();
            const bData = await bRes.json();
            
            setNotices(nData.notices || []);
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/v1/notices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                toast.success("Notice published successfully");
                setIsModalOpen(false);
                setFormData(initialFormState());
                fetchInitialData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save notice");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm({ title: "Delete Notice?", message: "Are you sure you want to delete this notice?", type: "danger" })) return;
        try {
            const res = await fetch(`/api/v1/notices/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Notice deleted successfully");
                fetchInitialData();
            } else {
                toast.error("Failed to delete notice");
            }
        } catch (error) {
            toast.error("Error deleting notice");
        }
    };

    const { data: session } = useSession();
    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    const filteredNotices = notices.filter(n => {
        const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || n.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getTypeIcon = (type, isPinned) => {
        if (isPinned) return <Pin size={15} className="rotate-45 text-rose-600" />;
        switch (type) {
            case 'urgent': return <AlertTriangle size={15} className="text-amber-600" />;
            case 'event': return <Calendar size={15} className="text-blue-600" />;
            case 'success': return <CheckCircle2 size={15} className="text-emerald-600" />;
            default: return <Info size={15} className="text-slate-500" />;
        }
    };

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorNotices />
                </div>
            )}

            <div className={cn("space-y-6 max-w-7xl mx-auto", isInstructorOrStaff ? "hidden md:block" : "")}>
                {/* Clean Unified Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Notices
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage and broadcast announcements to students and staff.</p>
                    </div>
                    <Button onClick={() => { setFormData(initialFormState()); setIsModalOpen(true); }}>
                        <Plus size={16} className="mr-2" /> Create Notice
                    </Button>
                </div>

                {/* Filter and Search Row */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search notices by title or content..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-slate-400 text-xs font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        {[
                            { label: "All", value: "all" },
                            { label: "Information", value: "info" },
                            { label: "Urgent", value: "urgent" },
                            { label: "Event", value: "event" },
                            { label: "Success", value: "success" }
                        ].map(t => (
                            <button
                                key={t.value}
                                onClick={() => setTypeFilter(t.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors",
                                    typeFilter === t.value
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notices List / Grid */}
                {loading ? (
                    <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                ) : filteredNotices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredNotices.map(notice => (
                            <Card key={notice._id} className="p-5 bg-white border border-slate-200/80 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-colors">
                                <div>
                                    {/* Consolidated Metadata Row */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "p-1.5 rounded-md flex items-center justify-center",
                                                notice.isPinned ? "bg-rose-50" : "bg-slate-100"
                                            )}>
                                                {getTypeIcon(notice.type, notice.isPinned)}
                                            </div>
                                            <Badge variant={notice.type === 'urgent' ? 'danger' : notice.type === 'event' ? 'info' : 'neutral'}>
                                                {notice.type.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                Target: {notice.target}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">{notice.title}</h3>
                                    <p className="text-xs text-slate-500 font-normal line-clamp-3 mb-4 leading-relaxed">{notice.content}</p>
                                </div>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                                    <span className="text-[10px] font-medium text-slate-400">
                                        Posted {format(new Date(notice.createdAt), "MMM d, yyyy")}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => handleDelete(notice._id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                            title="Delete Notice"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Megaphone}
                        title="No notices found"
                        description={search || typeFilter !== 'all' ? "Try adjusting your search or type filter." : "Create your first notice to broadcast announcements."}
                        actionLabel="Create Notice"
                        onAction={() => { setFormData(initialFormState()); setIsModalOpen(true); }}
                    />
                )}

                {/* Create Modal - Portal-backed Edge-to-Edge Backdrop */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Create New Announcement"
                    className="max-w-lg"
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <Input 
                            label="Title *"
                            placeholder="e.g. Holiday Notice, Exam Schedule"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Content *</label>
                            <textarea 
                                className="w-full min-h-[110px] p-3 rounded-lg bg-white border border-slate-200 outline-none focus:border-slate-400 transition-colors text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                                placeholder="Write your announcement here..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Notice Type</label>
                                <Select 
                                    value={formData.type}
                                    onChange={(val) => setFormData({ ...formData, type: val })}
                                    options={[
                                        { label: "Information", value: "info" },
                                        { label: "Urgent / Warning", value: "urgent" },
                                        { label: "Event / Celebration", value: "event" },
                                        { label: "Success / Result", value: "success" },
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Audience Target</label>
                                <Select 
                                    value={formData.target}
                                    onChange={(val) => setFormData({ ...formData, target: val, targetIds: [] })}
                                    options={[
                                        { label: "All Students & Staff", value: "all" },
                                        { label: "Specific Batches", value: "batches" },
                                        { label: "Specific Courses", value: "courses" },
                                    ]}
                                />
                            </div>
                        </div>

                        {formData.target !== 'all' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                    Select {formData.target.charAt(0).toUpperCase() + formData.target.slice(1)}
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-[140px] overflow-y-auto">
                                    {(formData.target === 'courses' ? courses : batches).map(item => (
                                        <label key={item._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={formData.targetIds.includes(item._id)}
                                                onChange={(e) => {
                                                    const newIds = e.target.checked 
                                                        ? [...formData.targetIds, item._id]
                                                        : formData.targetIds.filter(id => id !== item._id);
                                                    setFormData({ ...formData, targetIds: newIds });
                                                }}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                                            />
                                            <span className="text-xs font-medium text-slate-700 truncate">{item.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={formData.isPinned}
                                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-0"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">Pin Notice</span>
                                    <span className="text-[10px] text-slate-500 font-medium">Keep at top of board.</span>
                                </div>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">Set Active</span>
                                    <span className="text-[10px] text-slate-500 font-medium">Visible to students immediately.</span>
                                </div>
                            </label>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="min-w-[140px]">
                                {saving ? "Publishing..." : "Publish Announcement"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
}
