"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Skeleton from "@/components/shared/Skeleton";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    CalendarCheck,
    Layers,
    Fingerprint,
    UserCheck,
    Search,
    Sparkles,
    Filter
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
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("all");
    const [loading, setLoading] = useState(true);
    const [fetchingMonth, setFetchingMonth] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(null);

    const fetchAttendance = useCallback(async (targetDate, batchId) => {
        try {
            setFetchingMonth(true);
            const m = targetDate.getMonth() + 1;
            const y = targetDate.getFullYear();
            const batchParam = batchId && batchId !== "all" ? `&batchId=${batchId}` : "";
            
            const res = await fetch(`/api/v1/student/attendance?month=${m}&year=${y}${batchParam}`);
            if (!res.ok) throw new Error("Failed to load attendance records");
            const data = await res.json();
            
            setHistory(data.history || []);
            if (data.batches && Array.isArray(data.batches)) {
                setBatches(data.batches);
            }
            setError(null);
        } catch (err) {
            console.error("Attendance fetch error:", err);
            setError("Unable to load attendance records. Please try refreshing.");
        } finally {
            setLoading(false);
            setFetchingMonth(false);
        }
    }, []);

    useEffect(() => {
        fetchAttendance(currentMonth, selectedBatch);
    }, [currentMonth, selectedBatch, fetchAttendance]);

    const handleMonthChange = (direction) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(currentMonth.getMonth() + direction);
        setCurrentMonth(newDate);
        const now = new Date();
        if (isSameMonth(newDate, now)) {
            setSelectedDate(now);
        } else {
            setSelectedDate(startOfMonth(newDate));
        }
    };

    const monthRecords = useMemo(() => {
        return history.filter(h => isSameMonth(new Date(h.date), currentMonth));
    }, [history, currentMonth]);

    const stats = useMemo(() => {
        const present = monthRecords.filter(r => r.status === 'present').length;
        const absent = monthRecords.filter(r => r.status === 'absent').length;
        const late = monthRecords.filter(r => r.status === 'late').length;
        const excused = monthRecords.filter(r => r.status === 'excused').length;
        const holiday = monthRecords.filter(r => r.status === 'holiday').length;
        const total = present + absent + late + excused;
        const rate = total > 0 ? Math.min(100, Math.round(((present + late) / total) * 100)) : 0;

        return {
            present,
            absent,
            late,
            excused,
            holiday,
            total,
            rate
        };
    }, [monthRecords]);

    const attendanceRate = stats.rate;

    const selectedRecord = useMemo(() => {
        return history.find(r => isSameDay(new Date(r.date), selectedDate));
    }, [history, selectedDate]);

    const filteredLog = useMemo(() => {
        return [...monthRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .filter(item => {
                if (statusFilter !== "all" && item.status !== statusFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                    (item.batchName && item.batchName.toLowerCase().includes(q)) ||
                    (item.periodName && item.periodName.toLowerCase().includes(q)) ||
                    (item.markedByName && item.markedByName.toLowerCase().includes(q)) ||
                    (item.remarks && item.remarks.toLowerCase().includes(q))
                );
            });
    }, [monthRecords, statusFilter, searchQuery]);

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
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            
            {/* Top Bar: Title & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                <div>
                    <h2 className="text-[18px] font-bold text-[#1E1B2E] tracking-tight">Attendance Record</h2>
                    <p className="text-[12px] text-[#8D8A9B]">
                        Monthly presence tracking, session verification & participation logs
                    </p>
                </div>

                {/* Controls Group */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Batch / Subject Filter Dropdown */}
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

                    {/* Month Navigator Pill */}
                    <div className="flex items-center bg-white border border-[#E9E8F0] rounded-full p-1 shadow-none">
                        <button
                            onClick={() => handleMonthChange(-1)}
                            className="p-1.5 hover:bg-slate-50 rounded-full text-[#8D8A9B] hover:text-[#1E1B2E] transition-colors"
                            title="Previous Month"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[13px] font-bold text-[#1E1B2E] min-w-[130px] text-center select-none">
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

                    {/* Jump to Today button (if viewing another month) */}
                    {!isSameMonth(currentMonth, new Date()) && (
                        <button
                            onClick={() => {
                                const now = new Date();
                                setCurrentMonth(now);
                                setSelectedDate(now);
                            }}
                            className="text-[11px] font-semibold text-[#6E5AE0] bg-[#EDE8FB] hover:bg-[#E3DCF9] px-3 py-1.5 rounded-full transition-colors active:scale-95"
                        >
                            Today
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Row (Adtech Spec: Flat hairline cards, zero ambient shadow, micro-dots) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Present</span>
                        <span className="w-2 h-2 rounded-full bg-[#33C481]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{stats.present}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Days in attendance</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Absent</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{stats.absent}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Unexcused absences</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Late</span>
                        <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                    </div>
                    <p className="text-[24px] font-bold text-[#1E1B2E] mt-1">{stats.late}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Recorded delays</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Monthly Rate</span>
                        <span className="w-2 h-2 rounded-full bg-[#6E5AE0]" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-[24px] font-bold text-[#1E1B2E]">{attendanceRate}%</p>
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight uppercase",
                            attendanceRate >= 75 ? "bg-[#E8F8F0] text-[#059669]" : "bg-[#FBE3E6] text-[#F4586A]"
                        )}>
                            {attendanceRate >= 75 ? "Good Standing" : "Needs Review"}
                        </span>
                    </div>
                    <p className="text-[11px] text-[#8D8A9B]">Target: 75% minimum</p>
                </div>
            </div>

            {/* Calendar Container */}
            <div className={cn(
                "rounded-[16px] border border-[#E9E8F0] bg-white p-4 sm:p-6 shadow-none transition-opacity",
                fetchingMonth && "opacity-60"
            )}>
                <div className="flex items-center justify-between pb-3 border-b border-[#E9E8F0]">
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={16} className="text-[#6E5AE0]" />
                        <h3 className="text-[13px] font-bold text-[#1E1B2E]">
                            {format(currentMonth, "MMMM yyyy")} Calendar Grid
                        </h3>
                    </div>
                    <span className="text-[11px] text-[#8D8A9B]">
                        Tap any date to inspect details
                    </span>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center pt-3 pb-2 border-b border-[#E9E8F0]">
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
                        const dayOfWeek = day.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        // Dot color & text
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
                                    "flex flex-col items-center justify-between p-1.5 sm:p-2.5 rounded-[12px] min-h-[58px] sm:min-h-[76px] transition-all border text-left",
                                    !isCurrentMonth && "opacity-30 border-transparent bg-transparent cursor-default",
                                    isCurrentMonth && (
                                        isSelected
                                            ? "border-[#6E5AE0] bg-[#EDE8FB]/30 ring-2 ring-[#6E5AE0]"
                                            : isWeekend
                                                ? "border-transparent bg-[#F9F8FD]/50 hover:border-[#E9E8F0]"
                                                : "border-transparent hover:border-[#E9E8F0] hover:bg-slate-50/60"
                                    )
                                )}
                            >
                                <span className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all",
                                    isToday
                                        ? "bg-[#6E5AE0] text-white"
                                        : isSelected
                                            ? "bg-[#EDE8FB] text-[#6E5AE0]"
                                            : isCurrentMonth
                                                ? (isWeekend ? "text-[#8D8A9B]" : "text-[#1E1B2E]")
                                                : "text-[#8D8A9B]"
                                )}>
                                    {format(day, "d")}
                                </span>

                                {/* Status indicator */}
                                {record && isCurrentMonth ? (
                                    <div className="flex flex-col items-center mt-1">
                                        {/* Mobile: Colored micro dot */}
                                        <span className={cn("w-1.5 h-1.5 rounded-full sm:hidden", dotColor)} />
                                        
                                        {/* Desktop: Small Adtech micro-chip */}
                                        <span className={cn(
                                            "hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold mt-1 leading-none capitalize",
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

                {/* Legend strip */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-[11px] text-[#8D8A9B] pt-4 mt-3 border-t border-[#E9E8F0]">
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
                        <span>Holiday / Scheduled Off</span>
                    </div>
                </div>
            </div>

            {/* Day Inspector Card */}
            <div className="p-4 sm:p-5 rounded-[16px] border border-[#E9E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E9E8F0]">
                    <div className="flex items-center gap-2">
                        <CalendarCheck size={16} className="text-[#6E5AE0]" />
                        <h4 className="text-[13px] font-bold text-[#1E1B2E]">
                            Inspector: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </h4>
                    </div>
                    {isSameDay(selectedDate, new Date()) && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[10px] font-bold">
                            Today
                        </span>
                    )}
                </div>

                {selectedRecord ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 rounded-[12px] bg-[#F8F7FC] border border-[#E9E8F0]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Session Status</span>
                            <div className="mt-1 flex items-center gap-1.5">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[11px] font-bold capitalize",
                                    selectedRecord.status === 'present' && "bg-[#E8F8F0] text-[#059669]",
                                    selectedRecord.status === 'absent' && "bg-[#FBE3E6] text-[#F4586A]",
                                    selectedRecord.status === 'late' && "bg-[#FEF6E6] text-[#D97706]",
                                    selectedRecord.status === 'holiday' && "bg-[#EDE8FB] text-[#6E5AE0]"
                                )}>
                                    {selectedRecord.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-[12px] bg-[#F8F7FC] border border-[#E9E8F0]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Batch & Subject</span>
                            <p className="text-[13px] font-bold text-[#1E1B2E] mt-1 truncate">
                                {selectedRecord.batchName || "Academic Session"}
                            </p>
                        </div>

                        <div className="p-3 rounded-[12px] bg-[#F8F7FC] border border-[#E9E8F0]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Verification Method</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[12px] font-medium text-[#1E1B2E]">
                                <Fingerprint size={14} className="text-[#6E5AE0]" />
                                <span className="capitalize">
                                    {selectedRecord.method === 'face' ? 'Biometric Face Scan' : selectedRecord.method === 'qr' ? 'QR Verification' : 'Biometric / Register'}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-[12px] bg-[#F8F7FC] border border-[#E9E8F0]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Faculty In-Charge</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[12px] font-medium text-[#1E1B2E]">
                                <UserCheck size={14} className="text-[#6E5AE0]" />
                                <span className="truncate">{selectedRecord.markedByName || "Faculty Instructor"}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-3 text-[12px] text-[#8D8A9B]">
                        No recorded attendance activity for this date. (Scheduled holiday, weekend, or session off).
                    </div>
                )}
            </div>

            {/* Chronological Activity Log Section */}
            <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9E8F0]">
                    <div>
                        <h3 className="text-[14px] font-bold text-[#1E1B2E]">Monthly Activity Log</h3>
                        <p className="text-[11px] text-[#8D8A9B]">
                            Chronological history for {format(currentMonth, "MMMM yyyy")} ({monthRecords.length} entries)
                        </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {[
                            { id: "all", label: `All (${monthRecords.length})` },
                            { id: "present", label: `Present (${stats.present})` },
                            { id: "absent", label: `Absent (${stats.absent})` },
                            { id: "late", label: `Late (${stats.late})` }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors",
                                    statusFilter === f.id
                                        ? "bg-[#1E1B2E] text-white"
                                        : "bg-[#F8F7FC] text-[#8D8A9B] hover:text-[#1E1B2E] border border-[#E9E8F0]"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table / List */}
                {filteredLog.length === 0 ? (
                    <div className="py-8 text-center text-[12px] text-[#8D8A9B]">
                        No attendance entries matching the selected criteria.
                    </div>
                ) : (
                    <div className="divide-y divide-[#E9E8F0]">
                        {filteredLog.map(record => {
                            const recDate = new Date(record.date);
                            const isRecSelected = isSameDay(recDate, selectedDate);

                            return (
                                <div
                                    key={record._id}
                                    onClick={() => setSelectedDate(recDate)}
                                    className={cn(
                                        "py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[10px] cursor-pointer transition-colors",
                                        isRecSelected ? "bg-[#EDE8FB]/40" : "hover:bg-slate-50/70"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[10px] bg-[#F8F7FC] border border-[#E9E8F0] flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold uppercase text-[#8D8A9B] leading-none">
                                                {format(recDate, "MMM")}
                                            </span>
                                            <span className="text-[14px] font-extrabold text-[#1E1B2E] leading-tight">
                                                {format(recDate, "d")}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-[13px] font-bold text-[#1E1B2E]">
                                                {record.batchName}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] text-[#8D8A9B]">
                                                <span>{format(recDate, "EEEE")}</span>
                                                <span>•</span>
                                                <span>Verified by {record.markedByName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize",
                                            record.status === 'present' && "bg-[#E8F8F0] text-[#059669]",
                                            record.status === 'absent' && "bg-[#FBE3E6] text-[#F4586A]",
                                            record.status === 'late' && "bg-[#FEF6E6] text-[#D97706]",
                                            record.status === 'holiday' && "bg-[#EDE8FB] text-[#6E5AE0]"
                                        )}>
                                            {record.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
