"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    Calendar, 
    Clock, 
    X, 
    Save, 
    AlertTriangle,
    Filter,
    CalendarDays,
    BookOpen,
    Smile,
    Briefcase
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

export default function AdminCalendarPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            title: "",
            description: "",
            startDate: "",
            endDate: "",
            category: "general",
            target: "all",
            targetIds: []
        };
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [eRes, cRes, bRes] = await Promise.all([
                fetch("/api/v1/events"),
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);
            const eData = await eRes.json();
            const cData = await cRes.json();
            const bData = await bRes.json();
            
            setEvents(eData.events || []);
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
        } catch (error) {
            console.error("Failed to load calendar data:", error);
            toast.error("Failed to load calendar data");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (event) => {
        setEditingId(event._id);
        setFormData({
            title: event.title,
            description: event.description || "",
            startDate: event.startDate ? format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm") : "",
            endDate: event.endDate ? format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm") : "",
            category: event.category || "general",
            target: event.target || "all",
            targetIds: event.targetIds || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: "Delete Event?",
            message: "Are you sure you want to remove this event from the school calendar? This cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel"
        });

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/v1/events/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Event deleted successfully");
                fetchInitialData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete event");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingId ? `/api/v1/events/${editingId}` : "/api/v1/events";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                toast.success(editingId ? "Event updated successfully" : "Event created successfully");
                setIsModalOpen(false);
                setEditingId(null);
                setFormData(initialFormState());
                fetchInitialData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save event");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const getCategoryColor = (category) => {
        switch(category) {
            case 'holiday': return { bg: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'danger' };
            case 'exam': return { bg: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'warning' };
            case 'cultural': return { bg: 'bg-purple-50 border-purple-200 text-purple-700', badge: 'info' };
            case 'sports': return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'success' };
            case 'academic_assembly': return { bg: 'bg-sky-50 border-sky-200 text-sky-700', badge: 'info' };
            default: return { bg: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'neutral' };
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 italic uppercase">
                        <CalendarDays className="text-blue-600" />
                        School Calendar Manager
                    </h1>
                    <p className="text-slate-500 font-medium">Manage holidays, exam dates, fixtures, and events.</p>
                </div>
                <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }} className="shadow-lg shadow-blue-500/20">
                    <Plus size={18} className="mr-2" /> Add Calendar Event
                </Button>
            </div>

            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                        <CalendarDays size={28} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">No events on the calendar</h3>
                    <p className="text-slate-400 text-sm max-w-sm mt-1">Start feeding Shalom's academic fixtures and holidays to notify teachers, parents, and students.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => {
                        const style = getCategoryColor(event.category);
                        return (
                            <Card key={event._id} className={`relative group hover:shadow-md transition-all border border-slate-100 flex flex-col`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl border ${style.bg}`}>
                                        <Calendar size={20} />
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={style.badge}>
                                            {event.category.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target: {event.target}</span>
                                    </div>
                                </div>
                                
                                <h3 className="font-black text-slate-900 text-lg mb-1 line-clamp-1 italic">{event.title}</h3>
                                {event.description && (
                                    <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-4 leading-relaxed">{event.description}</p>
                                )}
                                
                                <div className="space-y-1.5 mt-auto mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>Start: {format(new Date(event.startDate), "MMM d, yyyy h:mm a")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>End: {format(new Date(event.endDate), "MMM d, yyyy h:mm a")}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                                        Created {format(new Date(event.createdAt), "MMM d")}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(event)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors rounded-lg">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(event._id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black italic text-slate-900 tracking-tight uppercase">
                                {editingId ? "Edit Event details" : "Add Calendar Event"}
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-6">
                            <Input 
                                label="Event Title"
                                placeholder="e.g. School Re-opens, Diwali Break, Pre-Board exams"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Description / Location</label>
                                <textarea 
                                    className="w-full min-h-[80px] p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-sm resize-none"
                                    placeholder="Add details or guidelines..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Input 
                                    type="datetime-local"
                                    label="Start Date & Time"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                />
                                <Input 
                                    type="datetime-local"
                                    label="End Date & Time"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Select 
                                    label="Event Category"
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val })}
                                    options={[
                                        { label: "General Event", value: "general" },
                                        { label: "Official Holiday", value: "holiday" },
                                        { label: "Offline/Online Exam", value: "exam" },
                                        { label: "Cultural Event", value: "cultural" },
                                        { label: "Sports Meet", value: "sports" },
                                        { label: "Academic Assembly", value: "academic_assembly" }
                                    ]}
                                />
                                <Select 
                                    label="Target Audience"
                                    value={formData.target}
                                    onChange={(val) => setFormData({ ...formData, target: val, targetIds: [] })}
                                    options={[
                                        { label: "Entire Institute", value: "all" },
                                        { label: "Specific Batches", value: "batches" },
                                        { label: "Specific Courses", value: "courses" }
                                    ]}
                                />
                            </div>

                            {/* Conditional Target IDs selection */}
                            {formData.target === "courses" && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Select Courses</label>
                                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                        {courses.map(course => {
                                            const isSelected = formData.targetIds.includes(course._id);
                                            return (
                                                <button
                                                    key={course._id}
                                                    type="button"
                                                    onClick={() => {
                                                        const targetIds = isSelected 
                                                            ? formData.targetIds.filter(id => id !== course._id)
                                                            : [...formData.targetIds, course._id];
                                                        setFormData({ ...formData, targetIds });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {course.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {formData.target === "batches" && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Select Batches</label>
                                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                        {batches.map(batch => {
                                            const isSelected = formData.targetIds.includes(batch._id);
                                            return (
                                                <button
                                                    key={batch._id}
                                                    type="button"
                                                    onClick={() => {
                                                        const targetIds = isSelected 
                                                            ? formData.targetIds.filter(id => id !== batch._id)
                                                            : [...formData.targetIds, batch._id];
                                                        setFormData({ ...formData, targetIds });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {batch.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                <Save size={16} className="mr-2" />
                                {saving ? "Saving..." : "Save Event"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
