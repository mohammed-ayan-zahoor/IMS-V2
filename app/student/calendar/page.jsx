"use client";

import { useState, useEffect, useRef } from "react";
import { 
    format, 
    startOfWeek, 
    endOfWeek, 
    isSameDay, 
    eachDayOfInterval,
    isToday,
    isPast,
    isSameWeek,
    parseISO,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    setHours,
    setMinutes,
    isWithinInterval
} from "date-fns";
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Clock, 
    CheckCircle2, 
    ArrowRight,
    LayoutGrid,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function AssignmentCalendarPage() {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // 'All', 'Pending', 'Completed', 'Overdue'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('All');
    const [viewMode, setViewMode] = useState('Weekly'); // 'Weekly', 'Daily'
    const scrollContainerRef = useRef(null);

    const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 0 });

    useEffect(() => {
        fetchAssignments();
        document.title = "Assignments | Quantech";

        // Auto-switch to Daily mode on mobile
        if (window.innerWidth < 768) {
            setViewMode('Daily');
        }
    }, []);

    // Handle Scroll Resets on View Toggle
    useEffect(() => {
        if (scrollContainerRef.current) {
            // Always reset horizontal scroll
            scrollContainerRef.current.scrollLeft = 0;

            // Vertical scroll to earliest assignment or 8am
            const dayAssignments = assignments.filter(a => isSameDay(a.dueDate, currentDate));
            let targetHour = 8;
            if (dayAssignments.length > 0) {
                targetHour = Math.min(...dayAssignments.map(a => a.dueDate.getHours()));
            }
            
            // Adjust for grid start at 5am
            scrollContainerRef.current.scrollTop = (targetHour - 5) * 48;
        }
    }, [viewMode, currentDate, loading]);

    const fetchAssignments = async () => {
        try {
            const res = await fetch("/api/v1/student/assignments/calendar");
            const data = await res.json();
            if (res.ok) {
                const parsed = (data.assignments || []).map(a => ({
                    ...a,
                    dueDate: a.dueDate ? parseISO(a.dueDate) : null
                })).filter(a => a.dueDate);
                setAssignments(parsed);
            } else {
                toast.error(data.error || "Failed to load assignments");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextPeriod = () => {
        if (viewMode === 'Daily') {
            setCurrentDate(addDays(currentDate, 1));
        } else {
            setCurrentDate(addWeeks(currentDate, 1));
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'Daily') {
            setCurrentDate(subDays(currentDate, 1));
        } else {
            setCurrentDate(subWeeks(currentDate, 1));
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    }; 

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <BookOpen size={28} className="text-blue-600" strokeWidth={2.5} />
                        Assignments
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage and track your academic deadlines.</p>
                </div>
            </div>

            {/* Quick Stats Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <FilterStatBox 
                    label="Pending" 
                    value={assignments.filter(a => a.submissionStatus === 'Not Submitted' && !isPast(a.dueDate)).length} 
                    color="amber"
                    active={filter === 'Pending'}
                    onClick={() => setFilter(filter === 'Pending' ? 'All' : 'Pending')}
                />
                <FilterStatBox 
                    label="Completed" 
                    value={assignments.filter(a => a.submissionStatus !== 'Not Submitted').length} 
                    color="emerald"
                    active={filter === 'Completed'}
                    onClick={() => setFilter(filter === 'Completed' ? 'All' : 'Completed')}
                />
                <FilterStatBox 
                    label="Overdue" 
                    value={assignments.filter(a => a.submissionStatus === 'Not Submitted' && isPast(a.dueDate)).length} 
                    color="rose"
                    active={filter === 'Overdue'}
                    onClick={() => setFilter(filter === 'Overdue' ? 'All' : 'Overdue')}
                />
            </div>

            {/* Dedicated Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-64">
                        <LayoutGrid size={16} className="text-slate-400" />
                        <select 
                            className="bg-transparent text-[13px] font-bold text-slate-600 outline-none w-full appearance-none cursor-pointer"
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                        >
                            <option value="All">All Subjects</option>
                            {[...new Set(assignments.map(a => a.course))].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <ChevronRight size={14} className="text-slate-400 rotate-90" />
                    </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Display Mode</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                        <button 
                            onClick={() => setViewMode('Weekly')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                                viewMode === 'Weekly' ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Weekly
                        </button>
                        <button 
                            onClick={() => setViewMode('Daily')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                                viewMode === 'Daily' ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Daily
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <Card className="rounded-2xl border-slate-200 shadow-lg bg-white overflow-hidden flex flex-col flex-1 min-h-[500px]">
                {/* Calendar Toolbar - Unified Navigation */}
                <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-white gap-3 sm:gap-0">
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={18} className="text-slate-400" />
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                {viewMode === 'Daily' 
                                    ? format(currentDate, "MMMM d, yyyy")
                                    : `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMMM d")} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMMM d, yyyy")}`
                                }
                            </h2>
                        </div>

                        {/* Navigation Controls - Close to data */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 sm:ml-4">
                            <button 
                                onClick={prevPeriod}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                    isToday(currentDate) 
                                        ? "text-slate-300" 
                                        : "bg-white shadow-sm text-blue-600"
                                )}
                            >
                                TODAY
                            </button>
                            <button 
                                onClick={nextPeriod}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 cursor-default group">
                        <LayoutGrid size={14} className="text-slate-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            {viewMode === 'Weekly' ? 'Weekly View' : 'Daily View'}
                        </span>
                    </div>
                </div>

                {/* Calendar Grid - Horizontal Scroll on Mobile */}
                <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
                    <div 
                        className={cn(
                            "flex-1 scrollbar-hide transition-all",
                            viewMode === 'Weekly' ? "overflow-auto" : "overflow-y-auto overflow-x-hidden"
                        )}
                        ref={scrollContainerRef}
                    >
                        <WeekGrid 
                            currentDate={currentDate} 
                            viewMode={viewMode}
                            assignments={assignments.filter(a => {
                                if (filter === 'Pending') return a.submissionStatus === 'Not Submitted' && !isPast(a.dueDate);
                                if (filter === 'Completed') return a.submissionStatus !== 'Not Submitted';
                                if (filter === 'Overdue') return a.submissionStatus === 'Not Submitted' && isPast(a.dueDate);
                                return true;
                            }).filter(a => selectedCourse === 'All' || a.course === selectedCourse)} 
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}

function WeekGrid({ currentDate, assignments, viewMode }) {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // If Daily mode, only show the selected date or current date if in same week
    const days = viewMode === 'Daily' ? [currentDate] : weekDays;

    // Time slots from 5 AM to 9 PM (Relevant School Day)
    const startHour = 5;
    const endHour = 21;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

    // Calculate grid positioning
    const HOUR_HEIGHT = 48; // Slightly taller for better legibility

    return (
        <div className={cn(
            "flex flex-col h-full",
            viewMode === 'Weekly' ? "min-w-[800px] sm:min-w-full" : "w-full min-w-full"
        )}>
            {/* Days Header */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 w-full">
                <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-white"></div> {/* Time column spacer */}
                {days.map(day => {
                    const isTodayDay = isToday(day);
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={cn(
                                "flex-1 border-r border-slate-200 py-3 text-center transition-colors cursor-pointer hover:bg-slate-50",
                                isTodayDay ? "bg-blue-50/50" : "bg-white",
                                viewMode === 'Daily' && !isSameDay(day, currentDate) ? "hidden sm:block" : ""
                            )}
                            onClick={() => {
                                if (viewMode === 'Daily') {
                                    setCurrentDate(day);
                                }
                            }}
                        >
                            <div className="flex flex-col items-center">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    isTodayDay ? "text-blue-600" : "text-slate-400"
                                )}>
                                    {format(day, "EEE")}
                                </span>
                                <span className={cn(
                                    "text-lg font-bold mt-0.5",
                                    isTodayDay ? "text-blue-700" : "text-slate-700",
                                    viewMode === 'Daily' && isSameDay(day, currentDate) ? "bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full mt-1 shadow-sm" : ""
                                )}>
                                    {format(day, "d")}
                                </span>
                                
                                {/* Activity Dot Indicator */}
                                {assignments.filter(a => isSameDay(a.dueDate, day)).length > 0 && (
                                    <div className="flex gap-0.5 mt-1">
                                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Grid Body */}
            <div className="flex flex-1 relative bg-white">
                {/* Time Axis */}
                <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10">
                    {hours.map(hour => (
                        <div key={hour} className="text-[10px] sm:text-[11px] font-medium text-slate-400 flex items-start justify-center pr-2" style={{ height: `${HOUR_HEIGHT}px` }}>
                            <span className="mt-[-8px]">{format(setHours(new Date(), hour), "h a")}</span>
                        </div>
                    ))}
                </div>

                {/* Day Columns */}
                {days.map((day, dayIndex) => {
                    const dayAssignments = assignments.filter(a => isSameDay(a.dueDate, day));
                    const isTodayDay = isToday(day);
                    
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={cn(
                                "flex-1 border-r border-slate-200 relative group transition-colors",
                                isTodayDay ? "bg-blue-50/10" : "bg-white",
                                viewMode === 'Daily' && !isSameDay(day, currentDate) ? "hidden sm:block" : ""
                            )}
                        >
                            {/* Empty State Messaging - Properly aligned */}
                            {dayAssignments.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 text-center">
                                    <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest leading-relaxed max-w-[100px] sm:max-w-[120px]">
                                        Free Day
                                    </p>
                                </div>
                            )}

                            {/* Hour grid lines (Visual Separators) */}
                            {hours.map(hour => (
                                <div key={hour} className="border-b border-slate-100 w-full" style={{ height: `${HOUR_HEIGHT}px` }} />
                            ))}

                            {/* Render Assignments as Blocks */}
                            {dayAssignments.map(assignment => {
                                const dueHour = assignment.dueDate.getHours();
                                const dueMinute = assignment.dueDate.getMinutes();
                                
                                // If due time is outside 8 AM - 8 PM, clamp it or put it in an "All day" area. 
                                // For simplicity, let's clamp it to the visible grid for rendering.
                                let displayHour = dueHour;
                                if (displayHour < startHour) displayHour = startHour;
                                if (displayHour > endHour) displayHour = endHour;

                                const topOffset = ((displayHour - startHour) + (dueMinute / 60)) * HOUR_HEIGHT;
                                
                                // Default assignment block height
                                const blockHeight = HOUR_HEIGHT * 1.5; // visually 1.5 hours tall
                                
                                const isOverdue = isPast(assignment.dueDate) && assignment.submissionStatus === 'Not Submitted';
                                const isCompleted = assignment.submissionStatus !== 'Not Submitted';
                                
                                let cardColor = "bg-amber-50/50 border-amber-100 border-l-amber-400";
                                let tagColor = "bg-amber-100 text-amber-700";
                                let hoverColor = "hover:border-amber-300 hover:shadow-md";
                                
                                if (isCompleted) {
                                    cardColor = "bg-emerald-50/50 border-emerald-100 border-l-emerald-400";
                                    tagColor = "bg-emerald-100 text-emerald-700";
                                    hoverColor = "hover:border-emerald-300 hover:shadow-md";
                                } else if (isOverdue) {
                                    cardColor = "bg-rose-50/50 border-rose-100 border-l-rose-400";
                                    tagColor = "bg-rose-100 text-rose-700";
                                    hoverColor = "hover:border-rose-300 hover:shadow-md";
                                }

                                return (
                                    <div 
                                        key={assignment.id} 
                                        className={cn(
                                            "absolute left-1.5 right-1.5 rounded-lg p-3 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer z-10 group/card border",
                                            isOverdue ? "border-l-[6px] border-l-rose-500 border-rose-100" : "border-l-[6px] border-l-blue-500 border-slate-100",
                                            cardColor,
                                            hoverColor
                                        )}
                                        style={{ top: `${topOffset}px`, height: `auto`, minHeight: '60px' }}
                                    >
                                        <div className="flex justify-between items-start gap-1">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 whitespace-nowrap`}>
                                                {assignment.course}
                                            </span>
                                            {isCompleted && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                                            {isOverdue && !isCompleted && <Badge variant="danger" className="text-[8px] px-1 py-0 h-4 font-bold border-none">DUE</Badge>}
                                        </div>
                                        <h4 className="text-[12px] font-bold text-slate-900 leading-snug line-clamp-2 mt-2">
                                            {assignment.title}
                                        </h4>
                                        <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400 gap-1">
                                            <Clock size={12} className="opacity-60" />
                                            {format(assignment.dueDate, "h:mm a")}
                                        </div>

                                        {/* Hover Popover - Show on left if at the end of the week */}
                                        <div className={`absolute top-0 ${dayIndex > 4 ? 'right-full mr-2' : 'left-full ml-2'} w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 opacity-0 invisible group-hover/card:opacity-100 group-hover/card:visible transition-all z-50 pointer-events-none group-hover/card:pointer-events-auto`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant={isOverdue ? "danger" : "neutral"} className="text-[8px] px-2 font-bold uppercase tracking-wider">
                                                    {isOverdue ? "Overdue" : assignment.submissionStatus}
                                                </Badge>
                                                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                    <LayoutGrid size={14} />
                                                </button>
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 mb-1 leading-tight">{assignment.title}</h3>
                                            <p className="text-xs text-slate-500 font-normal mb-4 line-clamp-3 leading-relaxed">{assignment.description || "No description provided."}</p>
                                            
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                    <BookOpen size={12} className="opacity-60" /> 
                                                    {assignment.totalMarks} Marks
                                                </span>
                                                <button 
                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group/btn"
                                                    onClick={() => window.location.href = `/student/materials?id=${assignment.id}`}
                                                >
                                                    View Details <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FilterStatBox({ label, value, color, active, onClick }) {
    const colors = {
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };

    return (
        <button 
            onClick={onClick}
            className={cn(
                "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                active ? "bg-white shadow-md border-blue-200 ring-2 ring-blue-500/20" : `bg-white/50 border-slate-200 hover:bg-white hover:border-slate-300`
            )}
        >
            <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <p className={cn("text-2xl font-bold", active ? "text-blue-600" : "text-slate-900")}>{value}</p>
            </div>
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                active ? "bg-blue-600 text-white" : `${colors[color]} group-hover:scale-110`
            )}>
                <CheckCircle2 size={18} />
            </div>
        </button>
    );
}
