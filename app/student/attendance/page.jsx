"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight
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

export default function StudentAttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await fetch("/api/v1/student/attendance");
                if (!res.ok) throw new Error("Failed to load attendance records");
                const data = await res.json();
                setHistory(data.history || []);
                setError(null);
            } catch (error) {
                console.error("Attendance fetch error:", error);
                setError("Unable to load attendance. Please try refreshing.");
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

    // Filter history for current month to calculate stats
    const monthRecords = history.filter(h => isSameMonth(new Date(h.date), currentMonth));

    const stats = {
        present: monthRecords.filter(r => r.status === 'present').length,
        absent: monthRecords.filter(r => r.status === 'absent').length,
        late: monthRecords.filter(r => r.status === 'late').length,
        total: monthRecords.length
    };

    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    if (loading) return <LoadingSpinner fullPage />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertCircle size={48} className="text-red-500 opacity-50" />
                <h3 className="text-lg font-bold text-slate-700">Error Loading Attendance</h3>
                <p className="text-slate-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Attendance Record</h1>
                    <p className="text-slate-500">Track your class participation.</p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-base font-bold text-slate-700 min-w-[140px] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsBadge label="Present" value={stats.present} total={stats.total} color="emerald" />
                <StatsBadge label="Absent" value={stats.absent} total={stats.total} color="red" />
                <StatsBadge label="Late" value={stats.late} total={stats.total} color="amber" />
                <div className="px-4 py-4 rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-slate-700">
                        {attendanceRate}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Rate</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(currentMonth)),
                        end: endOfWeek(endOfMonth(currentMonth))
                    }).map((day, idx) => {
                        // Find record for this day
                        const record = history.find(a => isSameDay(new Date(a.date), day));
                        const isCurrentMonth = isSameMonth(day, currentMonth);

                        let statusColor = "bg-slate-50 text-slate-300";
                        let icon = null;

                        if (record) {
                            if (record.status === 'present') {
                                statusColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                                icon = <CheckCircle2 size={16} />;
                            } else if (record.status === 'absent') {
                                statusColor = "bg-rose-50 text-rose-600 border border-rose-100";
                                icon = <XCircle size={16} />;
                            } else if (record.status === 'late') {
                                statusColor = "bg-amber-50 text-amber-600 border border-amber-100";
                                icon = <Clock size={16} />;
                            } else if (record.status === 'excused') {
                                statusColor = "bg-blue-50 text-blue-600 border border-blue-100";
                                icon = <AlertCircle size={16} />;
                            }
                        }

                        return (
                            <div
                                key={idx}
                                className={`
                                    min-h-[100px] p-3 rounded-xl flex flex-col items-start justify-between transition-all
                                    ${isCurrentMonth ? statusColor : "opacity-30 bg-slate-50"}
                                `}
                            >
                                <span className={`text-sm font-bold ${isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>
                                    {format(day, "d")}
                                </span>
                                {isCurrentMonth && record && (
                                    <div className="w-full">
                                        <div className="flex items-center gap-1 mb-1">
                                            {icon}
                                            <span className="text-xs font-bold capitalize">{record.status}</span>
                                        </div>
                                        <div className="text-[10px] font-medium opacity-80 truncate" title={record.batchName}>
                                            {record.batchName}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}

function StatsBadge({ label, value, total, color }) {
    const colors = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };

    return (
        <div className={`px-4 py-4 rounded-2xl border ${colors[color]} flex flex-col items-center justify-center shadow-sm`}>
            <span className="text-2xl font-black">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
        </div>
    );
}
