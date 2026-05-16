"use client";

import { useState, useEffect } from "react";
import { 
    Clock, 
    Calendar, 
    Loader2,
    Info
} from "lucide-react";
import Button from "@/components/ui/Button";
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

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const res = await fetch("/api/v1/student/timetable");
            if (res.ok) {
                const data = await res.json();
                setTimetable(data.timetable);
                
                // Build unified time slots map
                const slotsMap = new Map();
                Object.values(data.timetable).flat().forEach(cls => {
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
                
                // Sort by time, then by slot name to maintain relative order for identical times
                const sortedSlots = Array.from(slotsMap.values()).sort((a,b) => {
                    const timeCmp = a.startTime.localeCompare(b.startTime);
                    if (timeCmp !== 0) return timeCmp;
                    return (a.name || "").localeCompare(b.name || "");
                });
                setUnifiedSlots(sortedSlots);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-premium-blue" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Schedule...</p>
            </div>
        );
    }

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
                            <p className="text-slate-400 font-medium text-xs uppercase tracking-[0.2em] mt-0.5">Academic Calendar</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Table */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-lg overflow-hidden relative z-10">
                <div className="p-6 bg-[#FAFAFA] overflow-x-auto rounded-b-2xl">
                    <style dangerouslySetInnerHTML={{__html: `
                        .timetable-gap-bg {
                            background-image: repeating-linear-gradient(
                                -45deg,
                                transparent,
                                transparent 4px,
                                rgba(0,0,0,0.03) 4px,
                                rgba(0,0,0,0.03) 8px
                            );
                        }
                    `}} />
                    <div className="min-w-[900px]">
                        {unifiedSlots.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-slate-200 mt-2">
                                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 mb-4 ring-1 ring-slate-100">
                                    <Calendar size={32} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 tracking-tight italic">Schedule TBD</h4>
                                <p className="text-slate-400 text-xs mt-1.5 max-w-[280px] font-medium">
                                    Your batches don't have any classes scheduled yet.
                                </p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th className="w-16 border-r border-slate-200/50"></th>
                                        {DAYS.map(day => (
                                            <th key={day.id} className="pb-3 pt-2 px-2 text-left align-bottom border-b border-slate-200/50">
                                                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-800 ml-1">
                                                    {day.name}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {unifiedSlots.map((slot, idx) => {
                                        if (slot.isBreak) {
                                            return (
                                                <tr key={`slot-${idx}`}>
                                                    <td className="pr-4 py-2 align-top text-right w-16 border-r border-slate-200/50 relative">
                                                        <div className="text-[10px] text-slate-400 font-medium -mt-2 bg-[#FAFAFA]">{formatTime12Hour(slot.startTime)}</div>
                                                    </td>
                                                    <td colSpan={DAYS.length} className="p-0 align-top border-b border-slate-200/50">
                                                        <div className="timetable-gap-bg h-14 flex items-center justify-center relative border-l border-slate-200/50">
                                                            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent pointer-events-none"></div>
                                                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{slot.name}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={`slot-${idx}`}>
                                                <td className="pr-4 py-2 align-top text-right w-16 border-r border-slate-200/50 relative">
                                                    <div className="text-[10px] text-slate-400 font-medium -mt-2 bg-[#FAFAFA]">{formatTime12Hour(slot.startTime)}</div>
                                                </td>
                                                {DAYS.map(day => {
                                                    const dayClasses = timetable?.[day.id] || [];
                                                    const assign = dayClasses.find(c => 
                                                        c.slotName === slot.name && 
                                                        c.originalStartTime === slot.startTime && 
                                                        c.originalEndTime === slot.endTime && 
                                                        !c.isBreak
                                                    );

                                                    if (!assign) {
                                                        return (
                                                            <td key={day.id} className="p-0 align-top h-[110px] border-l border-b border-slate-200/50">
                                                                <div className="timetable-gap-bg w-full h-full flex justify-center items-center relative">
                                                                    <div className="absolute inset-0 bg-gradient-to-b from-black/[0.01] to-transparent pointer-events-none"></div>
                                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] opacity-0 hover:opacity-100 transition-opacity select-none z-10">GAP</span>
                                                                </div>
                                                            </td>
                                                        );
                                                    }

                                                    // Color badges
                                                    const badgeColors = ["bg-purple-500", "bg-orange-400", "bg-green-500", "bg-blue-500", "bg-rose-500"];
                                                    const colorClass = badgeColors[(assign.courseName?.charCodeAt(0) || 0) % badgeColors.length];

                                                    return (
                                                        <td key={day.id} className="p-1 align-top h-[110px] border-l border-b border-slate-200/50">
                                                            <div className="bg-white rounded-[2px] p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.06)] h-full flex flex-col hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-200 relative overflow-hidden">
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start gap-1">
                                                                        <h5 className="text-[13px] font-bold text-[#0ea5e9] leading-tight mb-1 tracking-tight">
                                                                            {assign.courseName || "Unknown"}
                                                                        </h5>
                                                                        {(assign.startTimeOverride || assign.endTimeOverride) && (
                                                                            <span className="shrink-0 text-[8px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded uppercase tracking-wider border border-rose-100">
                                                                                {formatTime12Hour(assign.startTime)} - {formatTime12Hour(assign.endTime)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11.5px] text-slate-400 font-medium truncate">
                                                                        {assign.instructor}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-auto pt-2">
                                                                    {assign.courseCode && (
                                                                        <span className={`text-[8.5px] ${colorClass} text-white px-1.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider`}>
                                                                            {assign.courseCode}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[8.5px] border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider">
                                                                        {slot.name.replace(/Period\s/i, 'P')}
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
                        )}
                    </div>
                </div>
            </div>

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
