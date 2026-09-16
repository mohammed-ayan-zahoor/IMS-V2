"use client";

import { useState, useEffect } from "react";
import Skeleton from "@/components/shared/Skeleton";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Sparkles,
    CalendarCheck,
    Layers
} from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay
} from "date-fns";
import { cn } from "@/lib/utils";

export default function StudentAttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await fetch("/api/v1/student/attendance");
                if (!res.ok) throw new Error("Failed to load attendance records");
                const data = await res.json();
                setHistory(data.history || []);
                setError(null);
            } catch (err) {
                console.error("Attendance fetch error:", err);
                setError("Unable to load attendance records. Please try refreshing.");
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    // Month records and statistics
    const monthRecords = history.filter(h => isSameMonth(new Date(h.date), currentMonth));

    const stats = {
        present: monthRecords.filter(r => r.status === 'present').length,
        absent: monthRecords.filter(r => r.status === 'absent').length,
        late: monthRecords.filter(r => r.status === 'late').length,
        excused: monthRecords.filter(r => r.status === 'excused').length,
        holiday: monthRecords.filter(r => r.status === 'holiday').length,
        total: monthRecords.filter(r => r.status !== 'holiday').length
    };

    const attendanceRate = stats.total > 0
        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
        : 0;

    // Selected date record for Day Inspector
    const selectedRecord = history.find(r => isSameDay(new Date(r.date), selectedDate));

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-14 w-full rounded-[16px]" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-[14px]" />)}
                </div>
                <Skeleton className="h-[420px] w-full rounded-[16px]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
                <AlertCircle size={40} className="text-[#F4586A]" />
                <h3 className="text-[16px] font-bold text-[#1E1B2E]">Attendance Sync Issue</h3>
                <p className="text-[13px] text-[#8D8A9B]">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-full bg-[#6E5AE0] text-white text-[12px] font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            
            {/* Top Bar: Title & Month Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                <div>
                    <h2 className="text-[18px] font-bold text-[#1E1B2E]">Attendance Heatmap</h2>
                    <p className="text-[12px] text-[#8D8A9B]">Detailed participation logs and monthly presence tracking</p>
                </div>

                {/* Month Navigator Pill */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center bg-white border border-[#E9E8F0] rounded-full p-1 shadow-none">
                        <button
                            onClick={() => handleMonthChange(-1)}
                            className="p-1.5 hover:bg-slate-50 rounded-full text-[#8D8A9B] hover:text-[#1E1B2E] transition-colors"
                            title="Previous Month"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[13px] font-bold text-[#1E1B2E] min-w-[130px] text-center">
                            {format(currentMonth, "MMMM yyyy")}
                        </span>
                        <button
                            onClick={() => handleMonthChange(1)}
                            className="p-1.5 hover:bg-slate-50 rounded-full text-[#8D8A9B] hover:text-[#1E1B2E] transition-colors"
                            title="Next Month"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Row (Adtech Spec: Hairline dividers or unboxed pill metrics, zero shadow) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Present</span>
                        <span className="w-2 h-2 rounded-full bg-[#33C481]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">{stats.present}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Days in attendance</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Absent</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">{stats.absent}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Unexcused absences</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Late</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">{stats.late}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Recorded delays</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Monthly Rate</span>
                        <span className="w-2 h-2 rounded-full bg-[#6E5AE0]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">{attendanceRate}%</p>
                    <p className="text-[11px] text-[#8D8A9B]">Target: 75% minimum</p>
                </div>
            </div>

            {/* Calendar Container */}
            <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-4 sm:p-6 shadow-none">
                
                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center pb-3 border-b border-[#E9E8F0]">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <span key={day} className="text-[11px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                            {day}
                        </span>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3">
                    {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(currentMonth)),
                        end: endOfWeek(endOfMonth(currentMonth))
                    }).map((day, idx) => {
                        const record = history.find(a => isSameDay(new Date(a.date), day));
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        // Dot color
                        let dotColor = null;
                        let statusText = null;
                        if (record) {
                            if (record.status === 'present') {
                                dotColor = "bg-[#33C481]";
                                statusText = "Present";
                            } else if (record.status === 'absent') {
                                dotColor = "bg-[#F4586A]";
                                statusText = "Absent";
                            } else if (record.status === 'late') {
                                dotColor = "bg-[#F4C24A]";
                                statusText = "Late";
                            } else if (record.status === 'holiday') {
                                dotColor = "bg-[#6E5AE0]";
                                statusText = "Holiday";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "flex flex-col items-center justify-between p-1.5 sm:p-2.5 rounded-[12px] min-h-[50px] sm:min-h-[74px] transition-all border text-left",
                                    !isCurrentMonth && "opacity-30 border-transparent bg-transparent",
                                    isCurrentMonth && (
                                        isSelected
                                            ? "border-[#6E5AE0] bg-[#EDE8FB]/30 ring-1 ring-[#6E5AE0]"
                                            : "border-transparent hover:border-[#E9E8F0] hover:bg-slate-50/50"
                                    )
                                )}
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold",
                                    isToday ? "bg-[#6E5AE0] text-white" : (isCurrentMonth ? "text-[#1E1B2E]" : "text-[#8D8A9B]")
                                )}>
                                    {format(day, "d")}
                                </span>

                                {/* Status indicator */}
                                {record && isCurrentMonth ? (
                                    <div className="flex flex-col items-center mt-1">
                                        {/* Mobile: Colored micro dot */}
                                        <span className={cn("w-1.5 h-1.5 rounded-full sm:hidden", dotColor)} />
                                        
                                        {/* Desktop: Small pill badge */}
                                        <span className={cn(
                                            "hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium mt-1 leading-none capitalize",
                                            record.status === 'present' && "bg-[#E8F8F0] text-[#059669]",
                                            record.status === 'absent' && "bg-[#FBE3E6] text-[#F4586A]",
                                            record.status === 'late' && "bg-[#FEF6E6] text-[#D97706]",
                                            record.status === 'holiday' && "bg-[#EDE8FB] text-[#6E5AE0]"
                                        )}>
                                            {statusText}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full opacity-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day Inspector Card (Crucial for iOS & mobile viewports) */}
            <div className="p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] bg-white space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E9E8F0]">
                    <div className="flex items-center gap-2">
                        <CalendarCheck size={16} className="text-[#6E5AE0]" />
                        <h4 className="text-[13px] font-bold text-[#1E1B2E]">
                            Inspector: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </h4>
                    </div>
                    {isSameDay(selectedDate, new Date()) && (
                        <span className="px-2 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[10px] font-bold">
                            Today
                        </span>
                    )}
                </div>

                {selectedRecord ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight uppercase",
                                    selectedRecord.status === 'present' && "bg-[#E8F8F0] text-[#059669]",
                                    selectedRecord.status === 'absent' && "bg-[#FBE3E6] text-[#F4586A]",
                                    selectedRecord.status === 'late' && "bg-[#FEF6E6] text-[#D97706]",
                                    selectedRecord.status === 'holiday' && "bg-[#EDE8FB] text-[#6E5AE0]"
                                )}>
                                    Status: {selectedRecord.status}
                                </span>
                            </div>
                            <p className="text-[13px] font-bold text-[#1E1B2E]">
                                {selectedRecord.batchName || "Academic Session"}
                            </p>
                        </div>
                        <div className="text-[12px] text-[#8D8A9B]">
                            Verified by biometric register
                        </div>
                    </div>
                ) : (
                    <div className="py-2 text-[12px] text-[#8D8A9B]">
                        No recorded attendance activity for this date. (Scheduled holiday, weekend, or session off).
                    </div>
                )}
            </div>

            {/* Legend strip */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-[11px] text-[#8D8A9B] pt-2">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#33C481]" />
                    <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F4586A]" />
                    <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F4C24A]" />
                    <span>Late</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6E5AE0]" />
                    <span>Holiday / Excused</span>
                </div>
            </div>
        </div>
    );
}
