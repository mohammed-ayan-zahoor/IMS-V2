"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { format, isToday, isSunday } from "date-fns";
import { StatStrip } from "./StatStrip";
import { MonthSwitcher } from "./MonthSwitcher";
import { StatusDot } from "./StatusDot";

export function AttendanceTab({
  attendanceMetrics,
  month,
  year,
  onMonthChange,
  loading = false,
  className = "",
}) {
  const [expandedClusters, setExpandedClusters] = useState({});

  const toggleCluster = (clusterId) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterId]: !prev[clusterId],
    }));
  };

  // Build calendar days for the selected month
  const { dayRows, hasPunchTimes, notMarkedCount } = useMemo(() => {
    const logs = attendanceMetrics?.currentMonthLogs || [];
    const logMap = new Map();
    let hasPunches = false;

    logs.forEach((log) => {
      if (log.date) {
        const dStr = format(new Date(log.date), "yyyy-MM-dd");
        logMap.set(dStr, log);
        if (log.actualPunchIn || log.actualPunchOut || log.checkIn || log.checkOut) {
          hasPunches = true;
        }
      }
    });

    const now = new Date();
    const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    // If current month, only evaluate days up to today
    const maxDay = isCurrentMonth ? Math.min(totalDaysInMonth, now.getDate()) : totalDaysInMonth;

    const list = [];
    let unrecorded = 0;

    for (let day = 1; day <= maxDay; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = format(dateObj, "yyyy-MM-dd");
      const isSun = isSunday(dateObj);
      const existing = logMap.get(dateStr);

      if (existing) {
        list.push({
          dateObj,
          dateStr,
          dayNum: day,
          isToday: isToday(dateObj),
          isSunday: isSun,
          status: existing.status || "present",
          inTime: existing.actualPunchIn || existing.checkIn || null,
          outTime: existing.actualPunchOut || existing.checkOut || null,
          note: existing.notes || existing.holidayName || (existing.lateMinutes > 0 ? `Late by ${existing.lateMinutes}m` : null),
          shift: existing.shiftName || null,
          isUnmarked: false,
        });
      } else if (isSun) {
        list.push({
          dateObj,
          dateStr,
          dayNum: day,
          isToday: isToday(dateObj),
          isSunday: true,
          status: "weekly_off",
          inTime: null,
          outTime: null,
          note: "Weekly off",
          isUnmarked: false,
        });
      } else {
        unrecorded++;
        list.push({
          dateObj,
          dateStr,
          dayNum: day,
          isToday: isToday(dateObj),
          isSunday: false,
          status: "not_marked",
          inTime: null,
          outTime: null,
          note: null,
          isUnmarked: true,
        });
      }
    }

    return {
      dayRows: list,
      hasPunchTimes: hasPunches,
      notMarkedCount: unrecorded,
    };
  }, [attendanceMetrics, month, year]);

  // Group consecutive unmarked day runs (>= 3 days)
  const groupedDisplayRows = useMemo(() => {
    const result = [];
    let currentUnmarkedRun = [];

    const flushRun = () => {
      if (currentUnmarkedRun.length >= 3) {
        const first = currentUnmarkedRun[0];
        const last = currentUnmarkedRun[currentUnmarkedRun.length - 1];
        const clusterId = `${first.dateStr}_to_${last.dateStr}`;

        result.push({
          type: "cluster",
          clusterId,
          firstDate: first.dateObj,
          lastDate: last.dateObj,
          count: currentUnmarkedRun.length,
          days: [...currentUnmarkedRun],
        });
      } else {
        currentUnmarkedRun.forEach((d) => result.push({ type: "day", data: d }));
      }
      currentUnmarkedRun = [];
    };

    dayRows.forEach((row) => {
      if (row.isUnmarked) {
        currentUnmarkedRun.push(row);
      } else {
        if (currentUnmarkedRun.length > 0) flushRun();
        result.push({ type: "day", data: row });
      }
    });

    if (currentUnmarkedRun.length > 0) flushRun();

    return result;
  }, [dayRows]);

  const summary = attendanceMetrics?.summary || {};

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[#101323] dark:text-gray-100">
            Attendance
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
            Biometric records used directly for payroll calculation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <MonthSwitcher
            month={month}
            year={year}
            onChange={onMonthChange}
          />

          <Link
            href="/admin/hr/attendance"
            className="h-9 px-3 rounded-[8px] border border-[#8E93A8]/40 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-[#F1F1F8] dark:hover:bg-gray-800 text-xs font-medium text-[#101323] dark:text-gray-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer active:scale-97 shadow-sm"
          >
            <span>Daily sheet</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
          </Link>
        </div>
      </div>

      {/* Unboxed Asymmetric Stat Strip */}
      <StatStrip
        present={summary.present || 0}
        absent={summary.absent || 0}
        halfDays={summary.halfDay || 0}
        onLeave={summary.onLeave || 0}
        lateHours={summary.totalLateHours || 0}
        overtimeHours={summary.totalOvertimeHours || 0}
        notMarked={notMarkedCount}
      />

      {/* Daily Attendance Table (Unboxed on page bg) */}
      <div className="pt-2">
        {!hasPunchTimes && (
          <p className="text-xs text-[#6B7280] dark:text-gray-400 pb-3 italic">
            Punch times aren&apos;t recorded for this month.
          </p>
        )}

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-xs text-[#6B7280]">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#4F46E5]" />
              Loading month attendance…
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-[#E9E9F1] dark:border-gray-800 text-xs text-[#6B7280] dark:text-gray-400">
                  <th className="py-2.5 font-medium w-[180px]">Date</th>
                  <th className="py-2.5 font-medium w-[140px]">Status</th>
                  {hasPunchTimes && (
                    <>
                      <th className="py-2.5 font-medium w-[90px]">In</th>
                      <th className="py-2.5 font-medium w-[90px]">Out</th>
                    </>
                  )}
                  <th className="py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E9F1]/80 dark:divide-gray-800/60 text-xs">
                {groupedDisplayRows.map((entry, idx) => {
                  if (entry.type === "cluster") {
                    const isExpanded = !!expandedClusters[entry.clusterId];
                    const rangeLabel = `${format(entry.firstDate, "EEE, d MMM")} – ${format(
                      entry.lastDate,
                      "EEE, d MMM"
                    )}`;

                    return (
                      <React.Fragment key={entry.clusterId}>
                        <tr className="bg-[#F8F8FC]/60 dark:bg-gray-900/40 hover:bg-[#F1F1F8] dark:hover:bg-gray-800/50 transition-colors">
                          <td colSpan={hasPunchTimes ? 5 : 3} className="py-2.5 px-1">
                            <button
                              type="button"
                              onClick={() => toggleCluster(entry.clusterId)}
                              className="w-full text-left flex items-center justify-between text-xs font-medium text-[#6B7280] dark:text-gray-400 hover:text-[#101323] dark:hover:text-gray-200 cursor-pointer py-1"
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium text-[#101323] dark:text-gray-200">
                                  {rangeLabel}
                                </span>
                                <span>·</span>
                                <span className="text-[#B45309] dark:text-amber-400">
                                  {entry.count} days not marked
                                </span>
                              </span>
                              <span className="text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1 text-[11px] font-semibold">
                                {isExpanded ? (
                                  <>
                                    Collapse <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    Expand <ChevronRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {isExpanded &&
                          entry.days.map((d) => (
                            <AttendanceDayRow
                              key={d.dateStr}
                              day={d}
                              hasPunchTimes={hasPunchTimes}
                              indent
                            />
                          ))}
                      </React.Fragment>
                    );
                  }

                  return (
                    <AttendanceDayRow
                      key={entry.data.dateStr}
                      day={entry.data}
                      hasPunchTimes={hasPunchTimes}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function AttendanceDayRow({ day, hasPunchTimes, indent = false }) {
  let statusTone = "muted";
  let statusLabel = "Not marked";
  let statusVariant = "ring";

  switch (day.status) {
    case "present":
      statusTone = "positive";
      statusLabel = "Present";
      statusVariant = "filled";
      break;
    case "absent":
      statusTone = "alert";
      statusLabel = "Absent";
      statusVariant = "filled";
      break;
    case "half_day":
    case "halfDay":
      statusTone = "warning";
      statusLabel = "Half day";
      statusVariant = "filled";
      break;
    case "on_leave":
    case "onLeave":
      statusTone = "accent";
      statusLabel = "On leave";
      statusVariant = "ring";
      break;
    case "weekly_off":
      statusTone = "accent";
      statusLabel = "Weekly off";
      statusVariant = "filled";
      break;
    case "holiday":
      statusTone = "accent";
      statusLabel = "Holiday";
      statusVariant = "filled";
      break;
    default:
      statusTone = "muted";
      statusLabel = "Not marked";
      statusVariant = "ring";
  }

  const formattedDate = format(day.dateObj, "EEE, d MMM");

  return (
    <tr
      className={`h-11 hover:bg-[#F1F1F8] dark:hover:bg-gray-800/40 transition-colors ${
        indent ? "bg-[#F8F8FC]/30 pl-4" : ""
      }`}
    >
      <td className="py-2.5 font-medium whitespace-nowrap">
        <span
          className={
            day.isToday
              ? "text-[#4F46E5] dark:text-indigo-400 font-bold"
              : "text-[#101323] dark:text-gray-200"
          }
        >
          {formattedDate}
        </span>
        {day.isToday && (
          <span className="ml-1.5 text-[10px] uppercase font-bold text-[#4F46E5]">
            Today
          </span>
        )}
      </td>

      <td className="py-2.5 whitespace-nowrap">
        <StatusDot
          tone={statusTone}
          label={statusLabel}
          variant={statusVariant}
          labelClassName={
            day.status === "absent"
              ? "text-[#101323] dark:text-white font-semibold"
              : day.status === "present"
              ? "text-[#6B7280] dark:text-gray-400"
              : ""
          }
        />
      </td>

      {hasPunchTimes && (
        <>
          <td className="py-2.5 tabular-nums text-[#101323] dark:text-gray-300">
            {day.inTime || "—"}
          </td>
          <td className="py-2.5 tabular-nums text-[#101323] dark:text-gray-300">
            {day.outTime || "—"}
          </td>
        </>
      )}

      <td className="py-2.5 text-[#6B7280] dark:text-gray-400 truncate max-w-[220px]">
        {day.note || (day.shift ? `Shift: ${day.shift}` : "—")}
      </td>
    </tr>
  );
}
