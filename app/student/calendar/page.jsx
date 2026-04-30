"use client";

import { useState, useEffect } from "react";
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    eachDayOfInterval,
    isToday,
    isPast,
    parseISO,
    isWithinInterval,
    addWeeks,
    subWeeks
} from "date-fns";
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    ExternalLink,
    ArrowRight,
    LayoutGrid,
    List as ListIcon,
    Search,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function AssignmentCalendarPage() {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState("month"); // month, list
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const res = await fetch("/api/v1/student/assignments/calendar");
            const data = await res.json();
            if (res.ok) {
                // Ensure dates are parsed correctly
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

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const getAssignmentsForDay = (day) => {
        return assignments.filter(a => isSameDay(a.dueDate, day));
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                            <CalendarIcon size={24} />
                        </div>
                        Assignment Calendar
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Track your deadlines and stay ahead of your course work.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                    <button 
                        onClick={() => setView("month")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            view === "month" ? "bg-premium-blue text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <LayoutGrid size={14} /> Month
                    </button>
                    <button 
                        onClick={() => setView("list")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            view === "list" ? "bg-premium-blue text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <ListIcon size={14} /> Timeline
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Calendar / List */}
                <div className="lg:col-span-8 space-y-8">
                    {view === "month" ? (
                        <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden p-8">
                            {/* Calendar Navigation */}
                            <div className="flex justify-between items-center mb-8 px-4">
                                <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">
                                    {format(currentDate, "MMMM yyyy")}
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={prevMonth} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={() => setCurrentDate(new Date())} className="px-4 h-10 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-blue-600 transition-all shadow-sm">
                                        Today
                                    </button>
                                    <button onClick={nextMonth} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <MonthCalendar 
                                currentDate={currentDate} 
                                assignments={assignments} 
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                            />
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {assignments.sort((a, b) => a.dueDate - b.dueDate).map((a, idx) => (
                                <TimelineItem key={a.id} assignment={a} index={idx} />
                            ))}
                            {assignments.length === 0 && (
                                <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                        <CalendarIcon size={40} />
                                    </div>
                                    <p className="text-slate-400 font-bold italic">No assignments found for your courses.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Selected Day Details & Summary */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Day Focus */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedDate.toISOString()}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                        <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden p-8 bg-white text-slate-900 min-h-[400px] flex flex-col relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-premium-blue/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="relative space-y-1 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-premium-blue">
                                    {format(selectedDate, "EEEE")}
                                </p>
                                <h3 className="text-3xl font-black italic tracking-tight">
                                    {format(selectedDate, "MMM d, yyyy")}
                                </h3>
                            </div>

                                <div className="flex-1 space-y-4">
                                    {getAssignmentsForDay(selectedDate).length > 0 ? (
                                        getAssignmentsForDay(selectedDate).map(a => (
                                            <div key={a.id} className="p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="neutral" className="bg-blue-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-3">
                                                        {a.course}
                                                    </Badge>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                                                        a.submissionStatus === 'Graded' ? 'text-emerald-400' :
                                                        a.submissionStatus === 'Submitted' ? 'text-blue-400' : 'text-rose-400'
                                                    }`}>
                                                        {a.submissionStatus}
                                                    </span>
                                                </div>
                                                <h4 className="font-black italic text-lg leading-tight mb-3">{a.title}</h4>
                                                <Button 
                                                    size="sm" 
                                                    className="w-full bg-white text-slate-900 rounded-xl font-black uppercase text-[9px] tracking-widest h-8"
                                                    onClick={() => window.location.href = `/student/materials`} // Redirect to materials to find it
                                                >
                                                    View Details <ArrowRight size={10} className="ml-2" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                            <CheckCircle2 size={48} className="mb-4 text-emerald-400" />
                                            <p className="text-sm font-bold italic">No deadlines for this day.<br/>Enjoy your free time!</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </AnimatePresence>

                    {/* Quick Stats */}
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden p-8 space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignment Overview</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <StatBox 
                                label="Pending" 
                                value={assignments.filter(a => a.submissionStatus === 'Not Submitted' && !isPast(a.dueDate)).length} 
                                color="rose"
                            />
                            <StatBox 
                                label="Completed" 
                                value={assignments.filter(a => a.submissionStatus !== 'Not Submitted').length} 
                                color="emerald"
                            />
                            <StatBox 
                                label="Due Soon" 
                                value={assignments.filter(a => {
                                    const diff = a.dueDate - new Date();
                                    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 && a.submissionStatus === 'Not Submitted';
                                }).length} 
                                color="amber"
                            />
                             <StatBox 
                                label="Overdue" 
                                value={assignments.filter(a => a.submissionStatus === 'Not Submitted' && isPast(a.dueDate)).length} 
                                color="slate"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MonthCalendar({ currentDate, assignments, selectedDate, onDateSelect }) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="w-full">
            <div className="grid grid-cols-7 mb-4">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
                {days.map(day => {
                    const dayAssignments = assignments.filter(a => isSameDay(a.dueDate, day));
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div 
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            className={`min-h-[100px] p-3 bg-white hover:bg-slate-50 transition-all cursor-pointer relative group ${
                                !isCurrentMonth ? "opacity-30" : ""
                            } ${isSelected ? "ring-2 ring-inset ring-blue-500 z-10" : ""}`}
                        >
                            <span className={`text-xs font-black ${
                                isTodayDay ? "w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-200" : 
                                isSelected ? "text-blue-600" : "text-slate-400"
                            }`}>
                                {format(day, "d")}
                            </span>

                            <div className="mt-2 space-y-1">
                                {dayAssignments.slice(0, 2).map(a => (
                                    <div key={a.id} className={`h-1.5 rounded-full ${
                                        a.submissionStatus === 'Graded' ? 'bg-emerald-400' :
                                        a.submissionStatus === 'Submitted' ? 'bg-blue-400' : 'bg-rose-400'
                                    }`} title={a.title} />
                                ))}
                                {dayAssignments.length > 2 && (
                                    <p className="text-[8px] font-black text-slate-400">+{dayAssignments.length - 2} More</p>
                                )}
                            </div>

                            {/* Hover Highlight */}
                            <div className="absolute inset-0 bg-blue-400/0 group-hover:bg-blue-400/5 transition-colors pointer-events-none" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TimelineItem({ assignment, index }) {
    const isOverdue = isPast(assignment.dueDate) && assignment.submissionStatus === 'Not Submitted';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden p-6 hover:translate-x-2 transition-transform group">
                <div className="flex items-center gap-6">
                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{format(assignment.dueDate, "MMM")}</span>
                        <span className="text-2xl font-black italic">{format(assignment.dueDate, "dd")}</span>
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="neutral" className="bg-blue-50 text-premium-blue border-blue-100 text-[8px] font-black uppercase tracking-widest px-3 rounded-lg">
                                {assignment.course}
                            </Badge>
                            {isOverdue ? (
                                <Badge variant="danger" className="uppercase text-[8px] font-black px-3">Overdue</Badge>
                            ) : assignment.submissionStatus === 'Graded' ? (
                                <Badge variant="success" className="uppercase text-[8px] font-black px-3">Graded</Badge>
                            ) : assignment.submissionStatus === 'Submitted' ? (
                                <Badge variant="info" className="uppercase text-[8px] font-black px-3">Submitted</Badge>
                            ) : (
                                <Badge variant="warning" className="uppercase text-[8px] font-black px-3">Pending</Badge>
                            )}
                        </div>
                        <h3 className="text-xl font-black italic text-slate-900 group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                            <Clock size={12} /> Due by {format(assignment.dueDate, "h:mm a")}
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <BookOpen size={12} /> {assignment.totalMarks} Marks
                        </p>
                    </div>

                    <Button 
                        onClick={() => window.location.href = `/student/materials`}
                        className="rounded-2xl w-14 h-14 p-0 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-premium-blue hover:text-white border border-slate-100 shadow-sm transition-all"
                    >
                        <ArrowRight size={20} />
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}

function StatBox({ label, value, color }) {
    const colors = {
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100",
    };

    return (
        <div className={`p-4 rounded-2xl border ${colors[color]} text-center`}>
            <p className="text-2xl font-black italic">{value}</p>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-1">{label}</p>
        </div>
    );
}
