"use client";

import { useState, useEffect, useMemo } from "react";
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
    Briefcase,
    List,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Users
} from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";

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
    
    // View Settings
    const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "list"
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Filters
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [targetFilter, setTargetFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleEdit = (event, e) => {
        if (e) e.stopPropagation();
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

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
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

    const getCategoryStyles = (category) => {
        switch(category) {
            case 'holiday': return { bg: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'danger', dot: 'bg-rose-500' };
            case 'exam': return { bg: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'warning', dot: 'bg-amber-500' };
            case 'cultural': return { bg: 'bg-purple-50 border-purple-200 text-purple-700', badge: 'info', dot: 'bg-purple-500' };
            case 'sports': return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'success', dot: 'bg-emerald-500' };
            case 'academic_assembly': return { bg: 'bg-sky-50 border-sky-200 text-sky-700', badge: 'info', dot: 'bg-sky-500' };
            default: return { bg: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'neutral', dot: 'bg-blue-500' };
        }
    };

    // Calculate calendar grid days
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const startOfCurrentMonth = new Date(year, month, 1);
        const endOfCurrentMonth = new Date(year, month + 1, 0);

        const startDayOfWeek = startOfCurrentMonth.getDay(); // 0 is Sunday
        const daysInMonth = endOfCurrentMonth.getDate();

        const days = [];

        // Previous month padding
        const prevMonthEnd = new Date(year, month, 0);
        const prevMonthDaysCount = prevMonthEnd.getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDaysCount - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding to make complete week rows
        const totalCells = days.length > 35 ? 42 : 35;
        const nextDaysNeeded = totalCells - days.length;
        for (let i = 1; i <= nextDaysNeeded; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [currentMonth]);

    // Filter events based on criteria
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
            const matchesTarget = targetFilter === "all" || event.target === targetFilter;
            const matchesSearch = searchQuery === "" || 
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesTarget && matchesSearch;
        });
    }, [events, categoryFilter, targetFilter, searchQuery]);

    // Helper to get events happening on a specific date
    const getEventsForDate = (date) => {
        return filteredEvents.filter(event => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            
            // Normalize to midnight for accurate check
            const targetTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
            
            return targetTime >= startTime && targetTime <= endTime;
        });
    };

    // Get events for the currently selected date
    const selectedDateEvents = useMemo(() => {
        return getEventsForDate(selectedDate);
    }, [selectedDate, filteredEvents]);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleGoToToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today);
    };

    const handleQuickAddEvent = (date) => {
        setSelectedDate(date);
        // Format date to local datetime format yyyy-MM-ddThh:mm
        const formattedDate = format(date, "yyyy-MM-dd") + "T09:00";
        const formattedEndDate = format(date, "yyyy-MM-dd") + "T17:00";
        setEditingId(null);
        setFormData({
            ...initialFormState(),
            startDate: formattedDate,
            endDate: formattedEndDate
        });
        setIsModalOpen(true);
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 italic uppercase">
                        <CalendarDays className="text-blue-600" />
                        School Calendar Manager
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage holidays, exam dates, fixtures, and events.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "calendar" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <CalendarDays size={14} />
                            Calendar
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <List size={14} />
                            List View
                        </button>
                    </div>

                    <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }} className="shadow-lg shadow-blue-500/20 w-full sm:w-auto">
                        <Plus size={18} className="mr-2" /> Add Event
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search events by title, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-sm text-slate-700"
                    />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="w-full md:w-48">
                        <Select
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            options={[
                                { label: "All Categories", value: "all" },
                                { label: "Holidays", value: "holiday" },
                                { label: "Exams", value: "exam" },
                                { label: "Cultural", value: "cultural" },
                                { label: "Sports", value: "sports" },
                                { label: "Assembly", value: "academic_assembly" },
                                { label: "General", value: "general" }
                            ]}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <Select
                            value={targetFilter}
                            onChange={setTargetFilter}
                            options={[
                                { label: "All Audiences", value: "all" },
                                { label: "Entire School", value: "all" },
                                { label: "Specific Batches", value: "batches" },
                                { label: "Specific Courses", value: "courses" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Main Area */}
            {viewMode === "calendar" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Monthly Grid Column (8 cols) */}
                    <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                        {/* Calendar Header Controls */}
                        <div className="flex justify-between items-center pb-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">
                                {format(currentMonth, "MMMM yyyy")}
                            </h2>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
                                <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={handleGoToToday} className="px-4 py-1.5 bg-white shadow-sm border border-slate-200 text-blue-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                                    TODAY
                                </button>
                                <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="overflow-hidden">
                            {/* Days of week header */}
                            <div className="grid grid-cols-7 text-center border-b border-slate-100 pb-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <span key={day} className="text-xs font-black uppercase tracking-wider text-slate-400 py-2">
                                        {day}
                                    </span>
                                ))}
                            </div>

                            {/* Calendar cells */}
                            <div className="grid grid-cols-7 border-l border-t border-slate-100">
                                {calendarDays.map((cell, idx) => {
                                    const dayEvents = getEventsForDate(cell.date);
                                    const isSelected = isSameDay(cell.date, selectedDate);
                                    const isTodayDate = isToday(cell.date);
                                    
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(cell.date)}
                                            onDoubleClick={() => handleQuickAddEvent(cell.date)}
                                            className={`min-h-[100px] p-2 border-r border-b border-slate-100 cursor-pointer flex flex-col justify-between hover:bg-slate-50/50 transition-all ${
                                                cell.isCurrentMonth ? "bg-white" : "bg-slate-50/40 text-slate-300"
                                            } ${isSelected ? "ring-2 ring-blue-500 ring-inset bg-blue-50/10" : ""}`}
                                        >
                                            {/* Date Number Badge */}
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                                                    isTodayDate 
                                                        ? "bg-blue-600 text-white shadow-sm font-black" 
                                                        : isSelected 
                                                            ? "text-blue-600 font-bold" 
                                                            : cell.isCurrentMonth ? "text-slate-800" : "text-slate-300"
                                                }`}>
                                                    {cell.date.getDate()}
                                                </span>
                                                
                                                {/* Mini add event indicator on hover */}
                                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 font-bold hover:text-blue-500">+</span>
                                            </div>

                                            {/* Mini events list */}
                                            <div className="space-y-1 mt-2">
                                                {dayEvents.slice(0, 3).map(event => {
                                                    const style = getCategoryStyles(event.category);
                                                    return (
                                                        <div
                                                            key={event._id}
                                                            onClick={(e) => handleEdit(event, e)}
                                                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold truncate border flex items-center gap-1 hover:brightness-95 transition-all ${style.bg}`}
                                                            title={event.title}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                                                            <span className="truncate">{event.title}</span>
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[9px] font-black text-slate-400 text-center uppercase tracking-wide">
                                                        + {dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Selected Day Panel (4 cols) */}
                    <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected Date</span>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase mt-1">
                                {format(selectedDate, "eeee, MMMM d")}
                            </h3>
                        </div>

                        {selectedDateEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-3xl border border-slate-100/50 text-center space-y-3">
                                <Smile className="text-slate-300 w-8 h-8" />
                                <div>
                                    <h4 className="font-bold text-slate-700 text-sm">No Events Scheduled</h4>
                                    <p className="text-slate-400 text-xs mt-1">A quiet, free day for students and teachers.</p>
                                </div>
                                <button
                                    onClick={() => handleQuickAddEvent(selectedDate)}
                                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add Event
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                {selectedDateEvents.map(event => {
                                    const style = getCategoryStyles(event.category);
                                    return (
                                        <div 
                                            key={event._id}
                                            className="p-4 rounded-3xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all flex flex-col justify-between"
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <h4 className="font-black text-slate-800 text-sm leading-snug">{event.title}</h4>
                                                <Badge variant={style.badge}>
                                                    {event.category.toUpperCase()}
                                                </Badge>
                                            </div>

                                            {event.description && (
                                                <p className="text-xs font-medium text-slate-500 mb-3 leading-relaxed">{event.description}</p>
                                            )}

                                            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-400 mb-3 border-t border-slate-100 pt-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    <span>Start: {format(new Date(event.startDate), "MMM d, h:mm a")}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    <span>End: {format(new Date(event.endDate), "MMM d, h:mm a")}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 border-t border-slate-50 pt-2">
                                                <button 
                                                    onClick={(e) => handleEdit(event, e)}
                                                    className="p-2 bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-all rounded-xl shadow-sm"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(event._id, e)}
                                                    className="p-2 bg-white border border-slate-100 hover:border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all rounded-xl shadow-sm"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* List View (Mock Cards) */
                filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                            <CalendarDays size={28} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">No events found</h3>
                        <p className="text-slate-400 text-sm max-w-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map(event => {
                            const style = getCategoryStyles(event.category);
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
                )
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
