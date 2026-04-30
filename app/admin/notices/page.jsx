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
    X, 
    Save, 
    AlertTriangle,
    Eye,
    EyeOff,
    Filter
} from "lucide-react";
import { format } from "date-fns";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function AdminNoticesPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    
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

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 italic">
                        <Megaphone className="text-blue-600" />
                        Notice Board Manager
                    </h1>
                    <p className="text-slate-500 font-medium">Broadcast announcements to students and staff.</p>
                </div>
                <Button onClick={() => { setFormData(initialFormState()); setIsModalOpen(true); }} className="shadow-lg shadow-blue-500/20">
                    <Plus size={18} className="mr-2" /> Create Notice
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notices.map(notice => (
                    <Card key={notice._id} className="relative group hover:border-blue-400/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${notice.isPinned ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                {notice.isPinned ? <Pin size={20} className="rotate-45" /> : <Megaphone size={20} />}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={notice.type === 'urgent' ? 'danger' : notice.type === 'event' ? 'info' : 'neutral'}>
                                    {notice.type.toUpperCase()}
                                </Badge>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target: {notice.target}</span>
                            </div>
                        </div>
                        
                        <h3 className="font-black text-slate-900 text-lg mb-2 line-clamp-1 italic">{notice.title}</h3>
                        <p className="text-xs font-medium text-slate-500 line-clamp-3 mb-6 leading-relaxed">{notice.content}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Posted {format(new Date(notice.createdAt), "MMM d")}
                            </span>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors rounded-lg">
                                    <Edit size={16} />
                                </button>
                                <button className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black italic text-slate-900 tracking-tight uppercase">Create New Announcement</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-6">
                            <Input 
                                label="Title"
                                placeholder="e.g. Holiday Notice, Event Reminder"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Content</label>
                                <textarea 
                                    className="w-full min-h-[120px] p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-sm resize-none"
                                    placeholder="Write your announcement here..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Select 
                                    label="Notice Type"
                                    value={formData.type}
                                    onChange={(val) => setFormData({ ...formData, type: val })}
                                    options={[
                                        { label: "Information", value: "info" },
                                        { label: "Urgent / Warning", value: "urgent" },
                                        { label: "Event / Celebration", value: "event" },
                                        { label: "Success / Result", value: "success" },
                                    ]}
                                />
                                <Select 
                                    label="Audience Target"
                                    value={formData.target}
                                    onChange={(val) => setFormData({ ...formData, target: val, targetIds: [] })}
                                    options={[
                                        { label: "All Students & Staff", value: "all" },
                                        { label: "Specific Batches", value: "batches" },
                                        { label: "Specific Courses", value: "courses" },
                                    ]}
                                />
                            </div>

                            {formData.target !== 'all' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Select {formData.target.charAt(0).toUpperCase() + formData.target.slice(1)}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl max-h-[150px] overflow-y-auto">
                                        {(formData.target === 'courses' ? courses : batches).map(item => (
                                            <label key={item._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.targetIds.includes(item._id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked 
                                                            ? [...formData.targetIds, item._id]
                                                            : formData.targetIds.filter(id => id !== item._id);
                                                        setFormData({ ...formData, targetIds: newIds });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{item.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-8 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isPinned}
                                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500/20"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-700">Pin Notice</span>
                                        <span className="text-[9px] font-bold text-slate-400">Keep this at the top of the board.</span>
                                    </div>
                                </label>
                                
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-700">Set Active</span>
                                        <span className="text-[9px] font-bold text-slate-400">Immediately visible to students.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold text-slate-500">Cancel</Button>
                            <Button type="submit" disabled={saving} className="px-10 shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[10px]">
                                {saving ? "Publishing..." : "Publish Announcement"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
