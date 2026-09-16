"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Clock, 
    Calendar, 
    Loader2, 
    User, 
    MapPin, 
    BookOpen, 
    Coffee, 
    CalendarDays,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Layers,
    Laptop,
    UserCheck,
    CheckCircle2
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const DAYS = [
    { id: 1, name: "Monday", short: "Mon" },
    { id: 2, name: "Tuesday", short: "Tue" },
    { id: 3, name: "Wednesday", short: "Wed" },
    { id: 4, name: "Thursday", short: "Thu" },
    { id: 5, name: "Friday", short: "Fri" },
    { id: 6, name: "Saturday", short: "Sat" },
    { id: 0, name: "Sunday", short: "Sun" }
];

const formatTime12Hour = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const numH = parseInt(h, 10);
    if (isNaN(numH)) return time24;
    const ampm = numH >= 12 ? "PM" : "AM";
    const finalH = numH % 12 || 12;
    return `${finalH}:${m} ${ampm}`;
};

const getClassStatus = (startTime, endTime, dayId) => {
    const now = new Date();
    if (now.getDay() !== dayId) {
        return dayId < now.getDay() ? 'completed' : 'upcoming';
    }
    if (!startTime || !endTime) return 'upcoming';
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 'upcoming';
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const currentMin = now.getHours() * 60 + now.getMinutes();

    if (currentMin >= startMin && currentMin <= endMin) {
        return 'live';
    }
    if (currentMin > endMin) {
        return 'completed';
    }
    return 'upcoming';
};

export default function StudentTimetablePage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState(null); 
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("all");
    const [unifiedSlots, setUnifiedSlots] = useState([]);
    
    // Default to today's day of week (Monday=1, ..., Sunday=0)
    const currentDayOfWeek = new Date().getDay();
    const [selectedDay, setSelectedDay] = useState(currentDayOfWeek);
    const [viewMode, setViewMode] = useState("auto"); // "auto", "day", "week"

    const fetchTimetable = useCallback(async (batchId) => {
        try {
            const batchParam = batchId && batchId !== "all" ? `?batchId=${batchId}` : "";
            const res = await fetch(`/api/v1/student/timetable${batchParam}`);
            if (res.ok) {
                const data = await res.json();
                setTimetable(data.timetable || {});
                if (data.batches && Array.isArray(data.batches)) {
                    setBatches(data.batches);
                }
                
                // Build unified time slots map
                const slotsMap = new Map();
                Object.values(data.timetable || {}).flat().forEach(cls => {
                    if (!cls) return;
                    const key = `${cls.slotName}-${cls.originalStartTime}-${cls.originalEndTime}-${cls.isBreak}`;
                    if (!slotsMap.has(key)) {
                        slotsMap.set(key, {
                            startTime: cls.originalStartTime,
                            endTime: cls.originalEndTime,
                            isBreak: cls.isBreak,
                            name: cls.slotName || (cls.isBreak ? "Break" : "Class")
                        });
                    }
                });
                
                // Sort by start time
                const sortedSlots = Array.from(slotsMap.values()).sort((a,b) => {
                    const timeCmp = (a.startTime || "").localeCompare(b.startTime || "");
                    if (timeCmp !== 0) return timeCmp;
                    return (a.name || "").localeCompare(b.name || "");
                });
                setUnifiedSlots(sortedSlots);
            } else {
                toast.error("Failed to load timetable");
            }
        } catch (error) {
            console.error("Fetch Timetable Error:", error);
            toast.error("An error occurred loading timetable");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTimetable(selectedBatch);
    }, [selectedBatch, fetchTimetable]);

    // Statistics memoization
    const totalWeeklyClasses = useMemo(() => {
        if (!timetable) return 0;
        return Object.values(timetable).flat().filter(c => c && !c.isBreak && c.type !== 'Gap').length;
    }, [timetable]);

    const todayClassesCount = useMemo(() => {
        if (!timetable) return 0;
        return (timetable[currentDayOfWeek] || []).filter(c => c && !c.isBreak && c.type !== 'Gap').length;
    }, [timetable, currentDayOfWeek]);

    const labClassesCount = useMemo(() => {
        if (!timetable) return 0;
        return Object.values(timetable).flat().filter(c => c && (c.type === 'Lab' || c.subjectType === 'LAB')).length;
    }, [timetable]);

    const activeBatchName = useMemo(() => {
        if (selectedBatch !== "all" && batches.length > 0) {
            const found = batches.find(b => b._id === selectedBatch);
            if (found) return `${found.name} · ${found.courseCode || ''}`;
        }
        return batches[0] ? `${batches[0].name} · ${batches[0].courseCode || ''}` : "Enrolled Course";
    }, [selectedBatch, batches]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#6E5AE0]" />
                <p className="text-[#8D8A9B] text-[12px] font-medium">Syncing class schedule...</p>
            </div>
        );
    }

    // Classes for selected day in Mobile/Day View
    const selectedDayClasses = (timetable?.[selectedDay] || []).filter(c => c && c.type !== 'Gap');
    const selectedDayMeta = DAYS.find(d => d.id === selectedDay) || DAYS[0];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            
            {/* Header with View Selector and Batch Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                <div>
                    <h2 className="text-[18px] font-bold text-[#1E1B2E] tracking-tight">Class Timetable</h2>
                    <p className="text-[12px] text-[#8D8A9B]">
                        Weekly lecture matrix, scheduled laboratory sessions & faculty hours
                    </p>
                </div>

                {/* Switcher & Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Batch / Subject Dropdown */}
                    {batches.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-white border border-[#E9E8F0] rounded-full px-3 py-1.5 text-[12px]">
                            <Layers size={13} className="text-[#6E5AE0]" />
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-[#1E1B2E] text-[12px] cursor-pointer"
                            >
                                <option value="all">All Subjects</option>
                                {batches.map(b => (
                                    <option key={b._id} value={b._id}>
                                        {b.name} {b.courseCode ? `(${b.courseCode})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Jump to Today Button */}
                    {selectedDay !== currentDayOfWeek && (
                        <button
                            onClick={() => setSelectedDay(currentDayOfWeek)}
                            className="text-[11px] font-semibold text-[#6E5AE0] bg-[#EDE8FB] hover:bg-[#E3DCF9] px-3 py-1.5 rounded-full transition-colors active:scale-95"
                        >
                            Today
                        </button>
                    )}

                    {/* View Switcher Pill */}
                    <div className="flex items-center bg-[#F1EFFB] p-1 rounded-full border border-[#E9E8F0]">
                        <button
                            onClick={() => setViewMode("day")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                viewMode === "day"
                                    ? "bg-white text-[#1E1B2E] shadow-sm font-bold"
                                    : (viewMode === "auto" ? "bg-white md:bg-transparent text-[#1E1B2E] md:text-[#8D8A9B] shadow-sm md:shadow-none" : "text-[#8D8A9B] hover:text-[#1E1B2E]")
                            )}
                        >
                            Daily Timeline
                        </button>
                        <button
                            onClick={() => setViewMode("week")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                viewMode === "week"
                                    ? "bg-white text-[#1E1B2E] shadow-sm font-bold"
                                    : (viewMode === "auto" ? "hidden md:inline-block md:bg-white md:text-[#1E1B2E] md:shadow-sm" : "text-[#8D8A9B] hover:text-[#1E1B2E]")
                            )}
                        >
                            Weekly Grid
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Summary Strip (Adtech flat hairline cards, zero shadow) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Today&apos;s Classes</span>
                        <span className="w-2 h-2 rounded-full bg-[#6E5AE0]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{todayClassesCount}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Scheduled for today</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Weekly Total</span>
                        <span className="w-2 h-2 rounded-full bg-[#33C481]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{totalWeeklyClasses}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Sessions this week</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Practical Labs</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{labClassesCount}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Hands-on lab modules</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Active Batch</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                    </div>
                    <p className="text-[16px] font-bold text-[#1E1B2E] mt-1 truncate">{activeBatchName}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Enrolled curriculum</p>
                </div>
            </div>

            {/* Day Selector Pill Bar (Always visible in day mode or on mobile) */}
            <div className={cn(
                "flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide",
                viewMode === "week" ? "hidden" : "flex"
            )}>
                {DAYS.map((day) => {
                    const isSelected = selectedDay === day.id;
                    const isToday = currentDayOfWeek === day.id;
                    const count = (timetable?.[day.id] || []).filter(c => c && !c.isBreak && c.type !== 'Gap').length;
                    
                    return (
                        <button
                            key={day.id}
                            onClick={() => setSelectedDay(day.id)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] sm:min-w-[84px] py-2 px-3 rounded-[12px] border transition-all text-center shrink-0 active:scale-95",
                                isSelected
                                    ? "bg-[#6E5AE0] border-[#6E5AE0] text-white shadow-sm"
                                    : "bg-white border-[#E9E8F0] text-[#1E1B2E] hover:border-[#8D8A9B]/40"
                            )}
                        >
                            <span className={cn(
                                "text-[11px] uppercase font-bold",
                                isSelected ? "text-white/80" : "text-[#8D8A9B]"
                            )}>
                                {day.short}
                            </span>
                            <span className={cn(
                                "text-[14px] font-bold mt-0.5",
                                isSelected ? "text-white" : "text-[#1E1B2E]"
                            )}>
                                {count} {count === 1 ? "Class" : "Classes"}
                            </span>
                            {isToday && (
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1",
                                    isSelected ? "bg-[#FCF3D6]" : "bg-[#6E5AE0]"
                                )} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 1. Daily Timeline View (Mobile default & desktop daily mode) */}
            <div className={cn(
                "space-y-3",
                viewMode === "day" ? "block" : (viewMode === "auto" ? "block md:hidden" : "hidden")
            )}>
                <div className="flex items-center justify-between px-1 text-[13px] font-bold text-[#1E1B2E]">
                    <span>{selectedDayMeta.name}&apos;s Schedule</span>
                    <span className="text-[12px] text-[#8D8A9B] font-normal">
                        {selectedDayClasses.length} Scheduled Slots
                    </span>
                </div>

                {selectedDayClasses.length > 0 ? (
                    selectedDayClasses.map((cls, idx) => {
                        const status = getClassStatus(cls.startTime, cls.endTime, selectedDay);
                        const isLab = cls.type === 'Lab' || cls.subjectType === 'LAB';

                        if (cls.isBreak) {
                            return (
                                <div
                                    key={idx}
                                    className="p-3.5 rounded-[14px] border border-dashed border-[#E9E8F0] bg-slate-50/50 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-[8px] bg-[#FCF3D6] flex items-center justify-center text-[#D97706]">
                                            <Coffee size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#1E1B2E]">{cls.slotName || "Interval / Break"}</p>
                                            <p className="text-[11px] text-[#8D8A9B]">Recess & Refreshments</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-[#8D8A9B] bg-white px-2.5 py-1 rounded-full border border-[#E9E8F0]">
                                        {formatTime12Hour(cls.startTime)} - {formatTime12Hour(cls.endTime)}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "p-4 rounded-[14px] border bg-white transition-all space-y-3",
                                    status === 'live' ? "border-[#6E5AE0] ring-1 ring-[#6E5AE0]/30" : "border-[#E9E8F0]"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5",
                                            isLab ? "bg-[#FEF6E6] text-[#D97706]" : "bg-[#F1EFFB] text-[#6E5AE0]"
                                        )}>
                                            {isLab ? <Laptop size={18} /> : <BookOpen size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-[14px] font-bold text-[#1E1B2E] leading-tight">
                                                    {cls.courseName || "Academic Lecture"}
                                                </h4>
                                                {status === 'live' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8F0] text-[#059669]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                                                        Happening Now
                                                    </span>
                                                )}
                                                {status === 'completed' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F8F7FC] text-[#8D8A9B]">
                                                        Completed
                                                    </span>
                                                )}
                                                {status === 'upcoming' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDE8FB] text-[#6E5AE0]">
                                                        Upcoming
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[12px] text-[#8D8A9B] mt-0.5">
                                                {cls.slotName || "Regular Session"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Time Pill */}
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[11px] font-semibold shrink-0">
                                        <Clock size={11} />
                                        {formatTime12Hour(cls.startTime)} - {formatTime12Hour(cls.endTime)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[12px] text-[#8D8A9B] pt-2 border-t border-[#E9E8F0]">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <UserCheck size={13} className="text-[#6E5AE0]" />
                                        <span className="truncate">{cls.instructor || "Assigned Faculty"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                            isLab ? "bg-[#FEF6E6] text-[#D97706]" : "bg-[#EDE8FB] text-[#6E5AE0]"
                                        )}>
                                            {isLab ? "Practical Lab" : "Theory"}
                                        </span>
                                        {cls.courseCode && (
                                            <span className="px-2 py-0.5 rounded-[6px] border border-[#E9E8F0] text-[10px] font-bold text-[#1E1B2E]">
                                                {cls.courseCode}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 px-4 rounded-[16px] border border-dashed border-[#E9E8F0] text-center bg-white">
                        <div className="w-12 h-12 rounded-full bg-[#EDE8FB] flex items-center justify-center mx-auto mb-3 text-[#6E5AE0]">
                            <CalendarDays size={22} />
                        </div>
                        <h4 className="text-[14px] font-bold text-[#1E1B2E]">
                            {selectedDayMeta.id === 0 ? "Rest & Self-Study Day" : "No Classes Scheduled"}
                        </h4>
                        <p className="text-[12px] text-[#8D8A9B] mt-0.5 max-w-xs mx-auto">
                            {selectedDayMeta.id === 0
                                ? "No sessions scheduled for Sunday. Enjoy your weekend or review your coursework."
                                : "Enjoy your free time or focus on independent study."}
                        </p>
                    </div>
                )}
            </div>

            {/* 2. Desktop Weekly Grid View (Adtech Spec: Thin hairline borders, zero ambient shadow) */}
            <div className={cn(
                "rounded-[16px] border border-[#E9E8F0] bg-white overflow-hidden shadow-none",
                viewMode === "week" ? "block" : (viewMode === "auto" ? "hidden md:block" : "hidden")
            )}>
                {unifiedSlots.length === 0 ? (
                    <div className="py-16 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#EDE8FB] flex items-center justify-center mx-auto mb-3 text-[#6E5AE0]">
                            <CalendarDays size={22} />
                        </div>
                        <h4 className="text-[15px] font-bold text-[#1E1B2E]">No Timetable Published</h4>
                        <p className="text-[12px] text-[#8D8A9B] mt-1 max-w-sm mx-auto">
                            No class slots have been scheduled for this batch yet. Please check back later or contact your instructor.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-[#E9E8F0] bg-slate-50/50">
                                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-[#8D8A9B] w-28 border-r border-[#E9E8F0]">
                                        Time Slot
                                    </th>
                                    {DAYS.map((day) => (
                                        <th
                                            key={day.id}
                                            className={cn(
                                                "p-3.5 text-center text-[12px] font-bold border-r border-[#E9E8F0] last:border-r-0",
                                                currentDayOfWeek === day.id ? "bg-[#EDE8FB]/50 text-[#6E5AE0]" : "text-[#1E1B2E]"
                                            )}
                                        >
                                            <span>{day.name}</span>
                                            {currentDayOfWeek === day.id && (
                                                <span className="block text-[10px] text-[#6E5AE0] font-normal">Today</span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E9E8F0]">
                                {unifiedSlots.map((slot, idx) => {
                                    if (slot.isBreak) {
                                        return (
                                            <tr key={idx} className="bg-slate-50/40">
                                                <td className="p-3 text-[11px] font-semibold text-[#8D8A9B] border-r border-[#E9E8F0] whitespace-nowrap">
                                                    {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                                                </td>
                                                <td colSpan={DAYS.length} className="p-3 text-center text-[11px] font-medium text-[#8D8A9B]">
                                                    ☕ {slot.name || "Recess Interval"}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="p-3 text-[11px] font-semibold text-[#8D8A9B] border-r border-[#E9E8F0] whitespace-nowrap align-top">
                                                <div>{formatTime12Hour(slot.startTime)}</div>
                                                <div className="text-[10px] text-[#8D8A9B]/70">{formatTime12Hour(slot.endTime)}</div>
                                            </td>
                                            {DAYS.map((day) => {
                                                const dayClasses = timetable?.[day.id] || [];
                                                const assign = dayClasses.find(c => 
                                                    c &&
                                                    c.slotName === slot.name && 
                                                    c.originalStartTime === slot.startTime && 
                                                    c.originalEndTime === slot.endTime && 
                                                    !c.isBreak &&
                                                    c.type !== 'Gap'
                                                );

                                                if (!assign) {
                                                    return (
                                                        <td key={day.id} className="p-2 border-r border-[#E9E8F0] last:border-r-0 align-top">
                                                            <div className="h-16 rounded-[8px] border border-dashed border-[#E9E8F0]/80 flex items-center justify-center text-[#8D8A9B]/30 text-[10px]">
                                                                Free
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                const isLab = assign.type === 'Lab' || assign.subjectType === 'LAB';

                                                return (
                                                    <td key={day.id} className={cn(
                                                        "p-2 border-r border-[#E9E8F0] last:border-r-0 align-top",
                                                        currentDayOfWeek === day.id && "bg-[#EDE8FB]/10"
                                                    )}>
                                                        <div className={cn(
                                                            "p-2.5 rounded-[10px] border bg-white h-full flex flex-col justify-between space-y-1.5 transition-all",
                                                            isLab ? "border-[#FEF6E6] hover:border-[#D97706]/40" : "border-[#E9E8F0] hover:border-[#6E5AE0]/40"
                                                        )}>
                                                            <div className="font-bold text-[12px] text-[#1E1B2E] leading-tight line-clamp-2">
                                                                {assign.courseName}
                                                            </div>
                                                            <div className="text-[10px] text-[#8D8A9B] truncate">
                                                                {assign.instructor || "Faculty"}
                                                            </div>
                                                            <div className="flex items-center gap-1 pt-1">
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase",
                                                                    isLab ? "bg-[#FEF6E6] text-[#D97706]" : "bg-[#F1EFFB] text-[#6E5AE0]"
                                                                )}>
                                                                    {assign.courseCode || (isLab ? "LAB" : "LEC")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
