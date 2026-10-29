"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { format, isToday, isSunday } from "date-fns";
import { StatStrip } from "./StatStrip";
import { MonthSwitcher } from "./MonthSwitcher";
import { StatusDot } from "./StatusDot";

const extractPunchTime = (timeStr, dateVal) => {
  if (timeStr && typeof timeStr === "string" && timeStr.trim()) {
    return timeStr.trim();
  }
  if (dateVal) {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
    } catch {}
  }
  return null;
};

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

  const { dayRows, notMarkedCount } = useMemo(() => {
    const logs = attendanceMetrics?.currentMonthLogs || [];
    const logMap = new Map();

    logs.forEach((log) => {
      if (log.date) {
        const dObj = new Date(log.date);
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, "0");
        const d = String(dObj.getDate()).padStart(2, "0");
        const localKey = `${y}-${m}-${d}`;
        logMap.set(localKey, log);

        const utcY = dObj.getUTCFullYear();
        const utcM = String(dObj.getUTCMonth() + 1).padStart(2, "0");
        const utcD = String(dObj.getUTCDate()).padStart(2, "0");
        const utcKey = `${utcY}-${utcM}-${utcD}`;
        logMap.set(utcKey, log);

        if (typeof log.date === "string") {
          logMap.set(log.date.split("T")[0], log);
        }
      }
    });

    const now = new Date();
    const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const maxDay = isCurrentMonth ? Math.min(totalDaysInMonth, now.getDate()) : totalDaysInMonth;

    const list = [];
    let unrecorded = 0;

    for (let day = 1; day <= maxDay; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = format(dateObj, "yyyy-MM-dd");
      const isSun = isSunday(dateObj);
      const existing = logMap.get(dateStr);

      if (existing) {
        const inTime = extractPunchTime(
          existing.checkInTime || existing.actualPunchIn || existing.checkIn,
          existing.checkInAt
        );
        const outTime = extractPunchTime(
          existing.checkOutTime || existing.actualPunchOut || existing.checkOut,
          existing.checkOutAt
        );

        list.push({
          dateObj,
          dateStr,
          dayNum: day,
          isToday: isToday(dateObj),
          isSunday: isSun,
          status: existing.status || "present",
          inTime,
          outTime,
          note:
            existing.notes ||
            existing.remarks ||
            existing.holidayName ||
            (existing.lateMinutes > 0 ? `Late by ${existing.lateMinutes}m` : null),
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
      notMarkedCount: unrecorded,
    };
  }, [attendanceMetrics, month, year]);

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
          <h2 className="text-[17px] font-semibold tracking-tight text-[#14161A]">
            Attendance
          </h2>
          <p className="text-[13px] text-[#5F6673] mt-0.5">
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
            className="h-8 px-3 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[13px] font-medium text-[#14161A] transition-colors inline-flex items-center gap-1.5 cursor-pointer active:scale-97 shadow-xs"
          >
            <span>Daily sheet</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#5F6673]" />
          </Link>
        </div>
      </div>

      {/* High-Contrast Stat Strip */}
      <StatStrip
        present={summary.present || 0}
        absent={summary.absent || 0}
        halfDays={summary.halfDay || 0}
        onLeave={summary.onLeave || 0}
        lateHours={summary.totalLateHours || 0}
        overtimeHours={summary.totalOvertimeHours || 0}
        notMarked={notMarkedCount}
      />

      {/* Daily Attendance Table */}
      <div className="pt-1">
        <div className="w-full overflow-x-auto rounded-xl bg-white border border-[#E6E8EC] shadow-xs">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-[13px] text-[#5F6673]">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#4F46E5]" />
              Loading month attendance…
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-[#E6E8EC] text-[11px] font-semibold text-[#5F6673] uppercase tracking-wider bg-[#F8F9FA]">
                  <th className="py-3 px-4 w-[160px]">Date</th>
                  <th className="py-3 px-4 w-[130px]">Status</th>
                  <th className="py-3 px-4 w-[95px]">In</th>
                  <th className="py-3 px-4 w-[95px]">Out</th>
                  <th className="py-3 px-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8EC]/80 text-[13px]">
                {groupedDisplayRows.map((entry) => {
                  if (entry.type === "cluster") {
                    const isExpanded = !!expandedClusters[entry.clusterId];
                    const rangeLabel = `${format(entry.firstDate, "EEE, d MMM")} – ${format(
                      entry.lastDate,
                      "EEE, d MMM"
                    )}`;

                    return (
                      <React.Fragment key={entry.clusterId}>
                        <tr className="bg-[#F8F9FA] hover:bg-[#F2F3F5] transition-colors">
                          <td colSpan={5} className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => toggleCluster(entry.clusterId)}
                              className="w-full text-left flex items-center justify-between text-[12px] font-medium text-[#5F6673] hover:text-[#14161A] cursor-pointer py-1"
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-semibold text-[#14161A]">
                                  {rangeLabel}
                                </span>
                                <span>·</span>
                                <span className="text-[#B45309] font-medium">
                                  {entry.count} days not marked
                                </span>
                              </span>
                              <span className="text-[#4F46E5] flex items-center gap-1 text-[11px] font-semibold">
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

function AttendanceDayRow({ day, indent = false }) {
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
      className={`h-12 hover:bg-[#F2F3F5]/60 transition-colors ${
        indent ? "bg-[#F8F9FA]/60 pl-4" : ""
      }`}
    >
      <td className="py-2.5 px-4 font-semibold whitespace-nowrap">
        <span
          className={
            day.isToday
              ? "text-[#4F46E5] font-bold"
              : "text-[#14161A]"
          }
        >
          {formattedDate}
        </span>
        {day.isToday && (
          <span className="ml-2 text-[10px] uppercase font-bold text-[#4F46E5] bg-[#EEF0FF] px-1.5 py-0.5 rounded">
            Today
          </span>
        )}
      </td>

      <td className="py-2.5 px-4 whitespace-nowrap">
        <StatusDot
          tone={statusTone}
          label={statusLabel}
          variant={statusVariant}
          labelClassName={
            day.status === "absent"
              ? "text-[#DC2626] font-bold"
              : day.status === "present"
              ? "text-[#047857] font-semibold"
              : "text-[#14161A] font-medium"
          }
        />
      </td>

      <td className="py-2.5 px-4 tabular-nums font-semibold text-[#14161A]">
        {day.inTime || "—"}
      </td>
      <td className="py-2.5 px-4 tabular-nums font-semibold text-[#14161A]">
        {day.outTime || "—"}
      </td>

      <td className="py-2.5 px-4 text-[#5F6673] truncate max-w-[220px]">
        {day.note || (day.shift ? `Shift: ${day.shift}` : "—")}
      </td>
    </tr>
  );
}
