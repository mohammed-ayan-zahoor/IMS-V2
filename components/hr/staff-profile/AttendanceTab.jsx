"use client";

import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSunday,
  addMonths,
  subMonths,
} from "date-fns";
import Card from "@/components/ui/Card";

function StatsBadge({ label, value, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <div
      className={`px-4 py-2 rounded-xl border ${colors[color]} flex flex-col items-center min-w-[80px] shadow-2xs`}
    >
      <span className="text-xl font-black">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </span>
    </div>
  );
}

export function AttendanceTab({
  attendanceMetrics,
  month,
  year,
  onMonthChange,
  loading = false,
  className = "",
}) {
  const currentMonthDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);

  const handleMonthOffset = (offset) => {
    const target = offset > 0 ? addMonths(currentMonthDate, 1) : subMonths(currentMonthDate, 1);
    onMonthChange(target.getMonth() + 1, target.getFullYear());
  };

  const logs = attendanceMetrics?.currentMonthLogs || [];
  const summary = attendanceMetrics?.summary || {};

  // Build map of logs by date string
  const logMap = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.date) {
        const dObj = new Date(log.date);
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, "0");
        const d = String(dObj.getDate()).padStart(2, "0");
        map.set(`${y}-${m}-${d}`, log);

        const utcY = dObj.getUTCFullYear();
        const utcM = String(dObj.getUTCMonth() + 1).padStart(2, "0");
        const utcD = String(dObj.getUTCDate()).padStart(2, "0");
        map.set(`${utcY}-${utcM}-${utcD}`, log);

        if (typeof log.date === "string") {
          map.set(log.date.split("T")[0], log);
        }
      }
    });
    return map;
  }, [logs]);

  // Calendar dates
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonthDate));
    const end = endOfWeek(endOfMonth(currentMonthDate));
    return eachDayOfInterval({ start, end });
  }, [currentMonthDate]);

  const presentCount = summary.present || 0;
  const absentCount = summary.absent || 0;
  const lateCount = summary.totalLateHours || summary.late || 0;
  const holidayCount = summary.holiday || 0;
  const totalDays = presentCount + absentCount;
  const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {/* Header with Title and Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Attendance History
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Biometric logs and punch records used for monthly payroll
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/hr/attendance"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            <span>Daily Sheet</span>
            <ExternalLink size={13} />
          </Link>

          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => handleMonthOffset(-1)}
              className="p-1 hover:bg-white hover:shadow-xs rounded-md transition-all text-slate-600 cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[110px] text-center select-none">
              {format(currentMonthDate, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => handleMonthOffset(1)}
              className="p-1 hover:bg-white hover:shadow-xs rounded-md transition-all text-slate-600 cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview Badges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsBadge label="Present" value={presentCount} color="emerald" />
        <StatsBadge label="Absent" value={absentCount} color="red" />
        <StatsBadge label="Late (Hrs)" value={lateCount} color="amber" />
        <StatsBadge label="Holidays" value={holidayCount} color="indigo" />
        <div className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-w-[80px] shadow-2xs">
          <span className="text-xl font-black text-slate-700">{attendanceRate}%</span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Attendance Rate
          </span>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <Card className="p-6 overflow-hidden shadow-xs border border-slate-100">
        {loading ? (
          <div className="py-24 flex items-center justify-center text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
            Loading attendance records…
          </div>
        ) : (
          <>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonthDate);
                const dateKey = format(day, "yyyy-MM-dd");
                const record = logMap.get(dateKey);

                let statusColor = "bg-slate-50/60 text-slate-400 border border-slate-100";
                let icon = null;
                let label = null;
                let punchTimes = null;

                if (record) {
                  const inTime = record.checkInTime || record.actualPunchIn || record.checkIn;
                  const outTime = record.checkOutTime || record.actualPunchOut || record.checkOut;

                  if (inTime || outTime) {
                    punchTimes = `${inTime || "—"} - ${outTime || "—"}`;
                  }

                  if (record.status === "present") {
                    statusColor = "bg-emerald-50 text-emerald-800 border border-emerald-200";
                    icon = <CheckCircle size={13} className="text-emerald-600 shrink-0" />;
                    label = "Present";
                  } else if (record.status === "absent") {
                    statusColor = "bg-rose-50 text-rose-800 border border-rose-200";
                    icon = <XCircle size={13} className="text-rose-600 shrink-0" />;
                    label = "Absent";
                  } else if (record.status === "half_day") {
                    statusColor = "bg-amber-50 text-amber-800 border border-amber-200";
                    icon = <Clock size={13} className="text-amber-600 shrink-0" />;
                    label = "Half Day";
                  } else if (record.status === "on_leave") {
                    statusColor = "bg-blue-50 text-blue-800 border border-blue-200";
                    icon = <AlertCircle size={13} className="text-blue-600 shrink-0" />;
                    label = "On Leave";
                  } else if (record.status === "holiday") {
                    statusColor = "bg-indigo-50 text-indigo-800 border border-indigo-200";
                    icon = <Calendar size={13} className="text-indigo-600 shrink-0" />;
                    label = record.holidayName || "Holiday";
                  }

                  if (record.lateMinutes && record.lateMinutes > 0) {
                    label = `Late ${record.lateMinutes}m`;
                  }
                } else if (isSunday(day)) {
                  statusColor = "bg-slate-50/70 text-slate-400 border border-slate-100";
                  label = "Weekly off";
                }

                return (
                  <div
                    key={idx}
                    className={`min-h-[88px] p-2 rounded-lg flex flex-col justify-between transition-all ${
                      isCurrentMonth
                        ? statusColor
                        : "opacity-25 bg-slate-50 border border-transparent"
                    }`}
                    title={record?.remarks || label || undefined}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isCurrentMonth ? "text-slate-700" : "text-slate-300"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {isToday(day) && (
                        <span className="text-[8px] font-bold uppercase tracking-tight px-1 py-0.2 rounded bg-indigo-600 text-white shadow-2xs">
                          Today
                        </span>
                      )}
                    </div>

                    {isCurrentMonth && (
                      <div className="w-full mt-1 space-y-0.5">
                        {punchTimes && (
                          <div className="text-[10px] font-mono font-bold leading-tight truncate">
                            {punchTimes}
                          </div>
                        )}
                        {label && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold truncate">
                            {icon}
                            <span className="truncate">{label}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
