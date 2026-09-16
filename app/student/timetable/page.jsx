"use client";

import { useState, useEffect } from "react";
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
    Sparkles
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

export default function StudentTimetablePage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState(null); 
    const [unifiedSlots, setUnifiedSlots] = useState([]);
    
    // Default to today's day of week (Monday=1, ..., Sunday=0)
    const currentDayOfWeek = new Date().getDay();
    const [selectedDay, setSelectedDay] = useState(currentDayOfWeek);
    const [viewMode, setViewMode] = useState("auto"); // "auto" (day on mobile, week on desktop), "day", "week"

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const res = await fetch("/api/v1/student/timetable");
            if (res.ok) {
                const data = await res.json();
                setTimetable(data.timetable || {});
                
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
    };

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
        <div className="space-y-6 max-w-6xl mx-auto pb-8">
            
            {/* Header with View Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                <div>
                    <h2 className="text-[18px] font-bold text-[#1E1B2E]">Weekly Timetable</h2>
                    <p className="text-[12px] text-[#8D8A9B]">View your scheduled periods, laboratories, and instructors</p>
                </div>

                {/* Switcher Pill */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#F1EFFB] p-1 rounded-full border border-[#E9E8F0]">
                        <button
                            onClick={() => setViewMode("day")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                (viewMode === "day" || (viewMode === "auto" && typeof window !== 'undefined' && window.innerWidth < 768))
                                    ? "bg-white text-[#1E1B2E] shadow-sm"
                                    : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Daily Timeline
                        </button>
                        <button
                            onClick={() => setViewMode("week")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                viewMode === "week"
                                    ? "bg-white text-[#1E1B2E] shadow-sm"
                                    : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Weekly Grid
                        </button>
                    </div>
                </div>
            </div>

            {/* Day Selector Pill Bar (Always visible on mobile, or in Day view on desktop) */}
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
                                "flex flex-col items-center justify-center min-w-[64px] sm:min-w-[80px] py-2 px-3 rounded-[12px] border transition-all text-center shrink-0",
                                isSelected
                                    ? "bg-[#6E5AE0] border-[#6E5AE0] text-white"
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

            {/* 1. Mobile & Daily Timeline View */}
            <div className={cn(
                "space-y-3",
                viewMode === "week" ? "hidden" : "block md:hidden"
            )}>
                <div className="flex items-center justify-between px-1 text-[13px] font-bold text-[#1E1B2E]">
                    <span>{selectedDayMeta.name}&apos;s Schedule</span>
                    <span className="text-[12px] text-[#8D8A9B] font-normal">
                        {selectedDayClasses.length} Scheduled Slots
                    </span>
                </div>

                {selectedDayClasses.length > 0 ? (
                    selectedDayClasses.map((cls, idx) => {
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
                                    <span className="text-[11px] font-medium text-[#8D8A9B] bg-white px-2.5 py-1 rounded-full border border-[#E9E8F0]">
                                        {formatTime12Hour(cls.startTime)} - {formatTime12Hour(cls.endTime)}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={idx}
                                className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-all space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-[10px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0 mt-0.5">
                                            <BookOpen size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[14px] font-bold text-[#1E1B2E] leading-tight">
                                                {cls.courseName || "Academic Lecture"}
                                            </h4>
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
                                        <User size={13} className="text-[#8D8A9B]" />
                                        <span className="truncate">{cls.instructor || "Assigned Faculty"}</span>
                                    </div>
                                    {cls.courseCode && (
                                        <span className="px-2 py-0.5 rounded-[6px] border border-[#E9E8F0] text-[10px] font-bold text-[#1E1B2E]">
                                            {cls.courseCode}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 px-4 rounded-[16px] border border-dashed border-[#E9E8F0] text-center bg-white">
                        <Calendar size={32} className="mx-auto text-[#8D8A9B]/50 mb-2" />
                        <h4 className="text-[14px] font-bold text-[#1E1B2E]">No Classes Scheduled</h4>
                        <p className="text-[12px] text-[#8D8A9B] mt-0.5">Enjoy your free time or focus on self-study</p>
                    </div>
                )}
            </div>

            {/* 2. Desktop Weekly Grid View (Adtech Spec: Thin hairline borders, no 900px blowout on desktop) */}
            <div className={cn(
                "rounded-[16px] border border-[#E9E8F0] bg-white overflow-hidden shadow-none",
                viewMode === "day" ? "hidden" : "hidden md:block"
            )}>
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

                                            return (
                                                <td key={day.id} className="p-2 border-r border-[#E9E8F0] last:border-r-0 align-top">
                                                    <div className="p-2.5 rounded-[10px] border border-[#E9E8F0] bg-white h-full flex flex-col justify-between space-y-1">
                                                        <div className="font-bold text-[12px] text-[#1E1B2E] leading-tight truncate">
                                                            {assign.courseName}
                                                        </div>
                                                        <div className="text-[10px] text-[#8D8A9B] truncate">
                                                            {assign.instructor || "Faculty"}
                                                        </div>
                                                        {assign.courseCode && (
                                                            <div className="pt-1">
                                                                <span className="px-1.5 py-0.5 rounded-[4px] bg-[#F1EFFB] text-[#6E5AE0] text-[9px] font-bold">
                                                                    {assign.courseCode}
                                                                </span>
                                                            </div>
                                                        )}
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
            </div>
        </div>
    );
}
