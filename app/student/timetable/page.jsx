"use client";

import { useState, useEffect } from "react";
import { 
    Clock, 
    Calendar, 
    MapPin, 
    User, 
    ChevronLeft, 
    ChevronRight,
    Search,
    BookOpen,
    Bell,
    CheckCircle2,
    Loader2,
    Info,
    LayoutGrid,
    List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const DAYS = [
    { id: 0, name: "Sunday", short: "Sun" },
    { id: 1, name: "Monday", short: "Mon" },
    { id: 2, name: "Tuesday", short: "Tue" },
    { id: 3, name: "Wednesday", short: "Wed" },
    { id: 4, name: "Thursday", short: "Thu" },
    { id: 5, name: "Friday", short: "Fri" },
    { id: 6, name: "Saturday", short: "Sat" }
];

export default function StudentTimetablePage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState(null);
    const [viewMode, setViewMode] = useState("list"); // list (mobile/compact), grid (desktop)
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchTimetable();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchTimetable = async () => {
        try {
            const res = await fetch("/api/v1/student/timetable");
            if (res.ok) {
                const data = await res.json();
                setTimetable(data.timetable);
            } else {
                toast.error("Failed to load timetable");
            }
        } catch (error) {
            console.error("Fetch Timetable Error:", error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const isCurrentlyOngoing = (start, end, day) => {
        if (day !== currentTime.getDay()) return false;
        
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        const nowH = currentTime.getHours();
        const nowM = currentTime.getMinutes();
        
        const startTimeInMinutes = startH * 60 + startM;
        const endTimeInMinutes = endH * 60 + endM;
        const nowTimeInMinutes = nowH * 60 + nowM;
        
        return nowTimeInMinutes >= startTimeInMinutes && nowTimeInMinutes <= endTimeInMinutes;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-premium-blue" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Schedule...</p>
            </div>
        );
    }

    const currentDayClasses = timetable?.[selectedDay] || [];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 text-slate-100 group-hover:text-blue-50 transition-colors">
                    <Calendar size={120} strokeWidth={1} />
                </div>
                
                <div className="relative space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-premium-blue flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Clock size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">Weekly Schedule</h1>
                            <p className="text-slate-400 font-medium text-xs uppercase tracking-[0.2em] mt-0.5">Academic Calendar 2025-26</p>
                        </div>
                    </div>
                </div>

                <div className="relative flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button 
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                            viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        )}
                    >
                        <List size={14} /> List
                    </button>
                    <button 
                        onClick={() => setViewMode("grid")}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                            viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        )}
                    >
                        <LayoutGrid size={14} /> Grid
                    </button>
                </div>
            </div>

            {/* Day Selector */}
            <div className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-lg flex overflow-x-auto no-scrollbar gap-2">
                {DAYS.map((day) => {
                    const hasClasses = timetable?.[day.id]?.length > 0;
                    const isToday = day.id === currentTime.getDay();
                    const isSelected = selectedDay === day.id;

                    return (
                        <button
                            key={day.id}
                            onClick={() => setSelectedDay(day.id)}
                            className={cn(
                                "flex-1 min-w-[80px] py-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative group",
                                isSelected 
                                    ? "bg-premium-blue text-white shadow-xl scale-105 z-10" 
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isSelected ? "text-slate-400" : "text-slate-400"
                            )}>{day.short}</span>
                            <span className="text-sm font-black">{day.name.split('')[0]}</span>
                            
                            {hasClasses && !isSelected && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                            {isToday && (
                                <div className={cn(
                                    "absolute -bottom-1 w-6 h-1 rounded-full",
                                    isSelected ? "bg-white" : "bg-premium-blue"
                                )} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Timetable Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedDay + viewMode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {currentDayClasses.length > 0 ? (
                        <div className={cn(
                            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"
                        )}>
                            {currentDayClasses.map((cls, idx) => (
                                <ClassCard 
                                    key={`${cls.batchId}-${idx}`} 
                                    cls={cls} 
                                    isOngoing={isCurrentlyOngoing(cls.startTime, cls.endTime, selectedDay)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-32 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 ring-1 ring-slate-100">
                                <BookOpen size={40} strokeWidth={1} />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight italic">Day Off!</h4>
                            <p className="text-slate-400 text-sm mt-2 max-w-[280px] font-medium">
                                No classes scheduled for {DAYS[selectedDay].name}. Use this time for self-study or relaxation.
                            </p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Quick Info Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
                        <Info size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black tracking-tight">Academic Notice</h4>
                        <p className="text-sm text-blue-100 font-medium max-w-sm mt-1">
                            Timetable changes are updated every Monday. Please check for specific holiday announcements in the Messages tab.
                        </p>
                    </div>
                </div>
                <Button className="bg-white text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest text-[10px] px-8 rounded-2xl shadow-xl">
                    Sync with Calendar
                </Button>
            </div>
        </div>
    );
}

function ClassCard({ cls, isOngoing, viewMode }) {
    const isBreak = cls.type === 'Break' || cls.isBreak;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={cn(
                "group relative overflow-hidden transition-all duration-500",
                viewMode === "grid" ? "h-full" : "w-full"
            )}
        >
            <div className={cn(
                "p-6 rounded-[2rem] border transition-all duration-500",
                isBreak ? "bg-orange-50/30 border-orange-100/50" : "bg-white",
                isOngoing 
                    ? "border-blue-200 shadow-2xl ring-4 ring-blue-50" 
                    : "border-slate-100 hover:border-slate-300 hover:shadow-xl"
            )}>
                {/* Status Indicator */}
                {isOngoing && (
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ongoing Now</span>
                    </div>
                )}

                <div className={cn(
                    "flex gap-6",
                    viewMode === "grid" ? "flex-col" : "items-center"
                )}>
                    {/* Time Column */}
                    <div className={cn(
                        "flex flex-col",
                        viewMode === "grid" ? "items-start" : "min-w-[120px] border-r border-slate-100"
                    )}>
                        <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                            <Clock size={16} className={cn("text-slate-400", isBreak && "text-orange-400")} />
                            <span>{cls.startTime}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-6">
                            to {cls.endTime}
                        </div>
                    </div>

                    {/* Info Column */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                    variant="primary" 
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-widest border",
                                        isBreak 
                                            ? "bg-orange-100 text-orange-600 border-orange-200" 
                                            : "bg-blue-50 text-blue-600 border-blue-100"
                                    )}
                                >
                                    {cls.courseCode}
                                </Badge>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">{cls.type}</span>
                            </div>
                            <h3 className={cn(
                                "text-xl font-black tracking-tight leading-tight transition-colors",
                                isBreak ? "text-orange-900" : "text-slate-900 group-hover:text-blue-600"
                            )}>
                                {cls.courseName}
                            </h3>
                            {!isBreak && <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">{cls.batchName}</p>}
                        </div>

                        {!isBreak && (
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Instructor</p>
                                        <p className="text-xs font-black text-slate-700 mt-1">{cls.instructor}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-blue-500 transition-colors cursor-pointer">
                                        <Bell size={14} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {isBreak && (
                            <div className="pt-4 border-t border-orange-100/50 italic text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                                Rest & Refreshment Break
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
