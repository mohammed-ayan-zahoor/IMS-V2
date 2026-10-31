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
  LogIn,
  LogOut,
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
      className={`px-3 sm:px-4 py-2 rounded-xl border ${colors[color]} flex flex-col items-center min-w-[70px] sm:min-w-[80px] shadow-2xs`}
    >
      <span className="text-lg sm:text-xl font-black">{value}</span>
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-80 text-center">
        {label}
      </span>
    </div>
  );
}

// Convert any date value or ISO string safely into Indian Standard Time (IST) YYYY-MM-DD
function getLocalDateString(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;

    // Use Intl DateTimeFormat anchored explicitly to Asia/Kolkata
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

// Extract human-readable punch time (e.g. "09:15 AM")
function extractPunchTime(timeStr, dateVal) {
  if (timeStr && typeof timeStr === "string" && timeStr.trim()) {
    return timeStr.trim();
  }
  if (dateVal) {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {}
  }
  return null;
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

  // Build accurate map of logs keyed by IST YYYY-MM-DD
  const logMap = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.date) {
        // Preferred key: IST calendar day
        const istKey = getLocalDateString(log.date);
        if (istKey) {
          map.set(istKey, log);
        }

        // Fallback local system date string
        const dObj = new Date(log.date);
        if (!isNaN(dObj.getTime())) {
          const ly = dObj.getFullYear();
          const lm = String(dObj.getMonth() + 1).padStart(2, "0");
          const ld = String(dObj.getDate()).padStart(2, "0");
          const localKey = `${ly}-${lm}-${ld}`;
          if (!map.has(localKey)) {
            map.set(localKey, log);
          }
        }

        // Only add string split if it doesn't collide with existing IST key
        if (typeof log.date === "string" && log.date.includes("-") && !log.date.includes("T")) {
          const rawDay = log.date.split("T")[0];
          if (!map.has(rawDay)) {
            map.set(rawDay, log);
          }
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <StatsBadge label="Present" value={presentCount} color="emerald" />
        <StatsBadge label="Absent" value={absentCount} color="red" />
        <StatsBadge label="Late (Hrs)" value={lateCount} color="amber" />
        <StatsBadge label="Holidays" value={holidayCount} color="indigo" />
        <div className="px-3 sm:px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-w-[70px] sm:min-w-[80px] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-lg sm:text-xl font-black text-slate-700">{attendanceRate}%</span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
            Attendance Rate
          </span>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <Card className="p-3 sm:p-5 md:p-6 overflow-hidden shadow-xs border border-slate-100">
        {loading ? (
          <div className="py-24 flex items-center justify-center text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
            Loading attendance records…
          </div>
        ) : (
          <div className="w-full overflow-x-auto -mx-1 sm:mx-0">
            <div className="min-w-[640px] sm:min-w-0">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest py-1.5"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentMonthDate);
                  const dateKey = format(day, "yyyy-MM-dd");
                  const record = logMap.get(dateKey);

                  let statusColor = "bg-slate-50/60 text-slate-400 border border-slate-100";
                  let icon = null;
                  let label = null;
                  let inTime = null;
                  let outTime = null;

                  if (record) {
                    inTime = extractPunchTime(
                      record.checkInTime || record.actualPunchIn || record.checkIn,
                      record.checkInAt
                    );
                    outTime = extractPunchTime(
                      record.checkOutTime || record.actualPunchOut || record.checkOut,
                      record.checkOutAt
                    );

                    if (record.status === "present") {
                      statusColor = "bg-emerald-50/90 text-emerald-900 border border-emerald-200/90";
                      icon = <CheckCircle size={11} className="text-emerald-600 shrink-0" />;
                      label = "Present";
                    } else if (record.status === "absent") {
                      statusColor = "bg-rose-50 text-rose-900 border border-rose-200";
                      icon = <XCircle size={11} className="text-rose-600 shrink-0" />;
                      label = "Absent";
                    } else if (record.status === "half_day") {
                      statusColor = "bg-amber-50 text-amber-900 border border-amber-200";
                      icon = <Clock size={11} className="text-amber-600 shrink-0" />;
                      label = "Half Day";
                    } else if (record.status === "on_leave") {
                      statusColor = "bg-blue-50 text-blue-900 border border-blue-200";
                      icon = <AlertCircle size={11} className="text-blue-600 shrink-0" />;
                      label = "On Leave";
                    } else if (record.status === "holiday") {
                      statusColor = "bg-indigo-50 text-indigo-900 border border-indigo-200";
                      icon = <Calendar size={11} className="text-indigo-600 shrink-0" />;
                      label = record.holidayName || "Holiday";
                    }

                    if (record.lateMinutes && record.lateMinutes > 0) {
                      label = `Late ${record.lateMinutes}m`;
                    }
                  } else if (isSunday(day)) {
                    statusColor = "bg-slate-50/70 text-slate-400 border border-slate-100";
                    label = "Weekly off";
                  }

                  // Tooltip hover text
                  const tooltipText = record
                    ? [
                        `${format(day, "EEEE, d MMMM yyyy")}`,
                        `Status: ${label || record.status}`,
                        inTime ? `Punch In: ${inTime}` : null,
                        outTime ? `Punch Out: ${outTime}` : null,
                        record.remarks ? `Note: ${record.remarks}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    : format(day, "EEEE, d MMMM yyyy");

                  return (
                    <div
                      key={idx}
                      className={`min-h-[82px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-lg flex flex-col justify-between transition-all overflow-hidden relative ${
                        isCurrentMonth
                          ? statusColor
                          : "opacity-25 bg-slate-50 border border-transparent"
                      }`}
                      title={tooltipText}
                    >
                      {/* Cell Header: Day number + Today pill */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold leading-none ${
                            isCurrentMonth ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {isToday(day) && (
                          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tight px-1 py-0.5 rounded bg-indigo-600 text-white shadow-2xs leading-none">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Cell Body: Status Badge & In / Out Times */}
                      {isCurrentMonth && (
                        <div className="w-full mt-1 space-y-1">
                          {/* In / Out punch times (clean responsive pills, no overflow) */}
                          {(inTime || outTime) && (
                            <div className="space-y-0.5">
                              {inTime && (
                                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100/70 px-1 py-0.5 rounded leading-none w-full min-w-0">
                                  <LogIn size={9} className="shrink-0 text-emerald-700" />
                                  <span className="truncate">{inTime}</span>
                                </div>
                              )}
                              {outTime && (
                                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-semibold text-sky-800 bg-sky-100/70 px-1 py-0.5 rounded leading-none w-full min-w-0">
                                  <LogOut size={9} className="shrink-0 text-sky-700" />
                                  <span className="truncate">{outTime}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Status Label (Present, Absent, etc.) */}
                          {label && (
                            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold leading-tight min-w-0">
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
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
