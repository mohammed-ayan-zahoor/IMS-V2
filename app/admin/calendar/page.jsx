"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    Calendar as CalendarIcon, 
    Clock, 
    AlertTriangle,
    CalendarDays,
    Smile,
    List,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Users,
    CheckCircle2,
    Info
} from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";

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
import MobileInstructorCalendar from "@/components/instructor/MobileInstructorCalendar";

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
            type: "danger"
        });

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/v1/events/${id}`, { method: "DELETE" });
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

        const startDayOfWeek = startOfCurrentMonth.getDay();
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

    const { data: session } = useSession();
    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorCalendar />
                </div>
            )}

            <div className={cn("space-y-6 max-w-7xl mx-auto", isInstructorOrStaff ? "hidden md:block" : "")}>
                {/* Compact Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            School Calendar
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage holidays, exam schedules, fixtures, and academic events.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode("calendar")}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
                                    viewMode === "calendar" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <CalendarDays size={14} />
                                Calendar
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
                                    viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <List size={14} />
                                List View
                            </button>
                        </div>

                        <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }}>
                            <Plus size={16} className="mr-2" /> Add Event
                        </Button>
                    </div>
                </div>

                {/* Consolidated Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Month Navigator */}
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-slate-900 min-w-[130px]">
                            {format(currentMonth, "MMMM yyyy")}
                        </h2>
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-white text-slate-500 rounded transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button type="button" onClick={handleGoToToday} className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-white rounded transition-colors">
                                Today
                            </button>
                            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-white text-slate-500 rounded transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                        <div className="w-full sm:w-40">
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

                        <div className="w-full sm:w-40">
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

                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-slate-400 text-xs font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {viewMode === "calendar" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* Calendar Grid Column (8 cols) */}
                        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/80">
                            {/* Days of week header */}
                            <div className="grid grid-cols-7 text-center border-b border-slate-100 pb-2 mb-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <span key={day} className="text-xs font-semibold text-slate-400">
                                        {day}
                                    </span>
                                ))}
                            </div>

                            {/* Calendar cells */}
                            <div className="grid grid-cols-7 border-l border-t border-slate-200/80">
                                {calendarDays.map((cell, idx) => {
                                    const dayEvents = getEventsForDate(cell.date);
                                    const isSelected = isSameDay(cell.date, selectedDate);
                                    const isTodayDate = isToday(cell.date);
                                    
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(cell.date)}
                                            onDoubleClick={() => handleQuickAddEvent(cell.date)}
                                            className={cn(
                                                "min-h-[110px] p-2 border-r border-b border-slate-200/80 cursor-pointer flex flex-col justify-between transition-colors",
                                                cell.isCurrentMonth ? "bg-white" : "bg-slate-50/40 text-slate-300",
                                                isSelected && "bg-blue-50/20 ring-2 ring-blue-500 ring-inset"
                                            )}
                                        >
                                            {/* Date Header */}
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={cn(
                                                    "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                                                    isTodayDate 
                                                        ? "bg-slate-900 text-white" 
                                                        : isSelected 
                                                            ? "text-blue-600 font-bold" 
                                                            : cell.isCurrentMonth ? "text-slate-800" : "text-slate-300"
                                                )}>
                                                    {cell.date.getDate()}
                                                </span>
                                            </div>

                                            {/* Event Chips */}
                                            <div className="space-y-1 mt-1">
                                                {dayEvents.slice(0, 2).map(event => {
                                                    const style = getCategoryStyles(event.category);
                                                    return (
                                                        <div
                                                            key={event._id}
                                                            onClick={(e) => handleEdit(event, e)}
                                                            className={cn(
                                                                "text-[10px] px-2 py-0.5 rounded font-semibold truncate border flex items-center gap-1.5 transition-colors",
                                                                style.bg
                                                            )}
                                                            title={event.title}
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
                                                            <span className="truncate">{event.title}</span>
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[10px] font-semibold text-slate-500 text-center">
                                                        +{dayEvents.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Day Panel (4 cols) */}
                        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Date</span>
                                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                                </h3>
                            </div>

                            {selectedDateEvents.length === 0 ? (
                                <div className="p-6 text-center space-y-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <Smile className="text-slate-300 mx-auto" size={32} />
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-xs">No Events Scheduled</h4>
                                        <p className="text-slate-400 text-[11px] mt-0.5">A quiet, free day for students and staff.</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleQuickAddEvent(selectedDate)}
                                    >
                                        <Plus size={14} className="mr-1" /> Add Event
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                    {selectedDateEvents.map(event => {
                                        const style = getCategoryStyles(event.category);
                                        return (
                                            <div 
                                                key={event._id}
                                                className="p-3.5 rounded-lg border border-slate-200/80 bg-white space-y-2"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{event.title}</h4>
                                                    <Badge variant={style.badge}>
                                                        {event.category.toUpperCase()}
                                                    </Badge>
                                                </div>

                                                {event.description && (
                                                    <p className="text-xs text-slate-500 font-normal leading-relaxed">{event.description}</p>
                                                )}

                                                <div className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-100">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span>{format(new Date(event.startDate), "MMM d, h:mm a")} - {format(new Date(event.endDate), "h:mm a")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users size={12} className="text-slate-400" />
                                                        <span>Target: {event.target}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => handleEdit(event, e)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded"
                                                        title="Edit Event"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => handleDelete(event._id, e)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                                        title="Delete Event"
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
                    /* List View */
                    filteredEvents.length === 0 ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="No events found"
                            description="Try adjusting your search query or category filters."
                            actionLabel="Add Event"
                            onAction={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredEvents.map(event => {
                                const style = getCategoryStyles(event.category);
                                return (
                                    <Card key={event._id} className="p-5 bg-white border border-slate-200/80 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-colors">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <Badge variant={style.badge}>
                                                    {event.category.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Target: {event.target}</span>
                                            </div>
                                            
                                            <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">{event.title}</h3>
                                            {event.description && (
                                                <p className="text-xs text-slate-500 font-normal line-clamp-2 mb-4 leading-relaxed">{event.description}</p>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            <div className="space-y-1 text-[10px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span>Start: {format(new Date(event.startDate), "MMM d, yyyy h:mm a")}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span>End: {format(new Date(event.endDate), "MMM d, yyyy h:mm a")}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    Created {format(new Date(event.createdAt), "MMM d")}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => handleEdit(event, e)} 
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded"
                                                        title="Edit Event"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => handleDelete(event._id, e)} 
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )
                )}

                {/* Create / Edit Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingId ? "Edit Event Details" : "Add Calendar Event"}
                    className="max-w-lg"
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <Input 
                            label="Event Title *"
                            placeholder="e.g. School Re-opens, Mid-Term Exams"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description / Location</label>
                            <textarea 
                                className="w-full min-h-[80px] p-3 rounded-lg bg-white border border-slate-200 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                                placeholder="Add details or guidelines..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                type="datetime-local"
                                label="Start Date & Time *"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                            <Input 
                                type="datetime-local"
                                label="End Date & Time *"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Event Category</label>
                                <Select 
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
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Target Audience</label>
                                <Select 
                                    value={formData.target}
                                    onChange={(val) => setFormData({ ...formData, target: val, targetIds: [] })}
                                    options={[
                                        { label: "Entire Institute", value: "all" },
                                        { label: "Specific Batches", value: "batches" },
                                        { label: "Specific Courses", value: "courses" }
                                    ]}
                                />
                            </div>
                        </div>

                        {formData.target === "courses" && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Select Courses</label>
                                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
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
                                                className={cn(
                                                    "px-2.5 py-1 rounded text-xs font-semibold border transition-colors",
                                                    isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                )}
                                            >
                                                {course.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {formData.target === "batches" && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Select Batches</label>
                                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
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
                                                className={cn(
                                                    "px-2.5 py-1 rounded text-xs font-semibold border transition-colors",
                                                    isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                )}
                                            >
                                                {batch.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="min-w-[140px]">
                                {saving ? "Saving..." : "Save Event"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
}
