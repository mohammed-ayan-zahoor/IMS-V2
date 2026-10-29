"use client";

import React from "react";

export function StatStrip({
  present = 0,
  absent = 0,
  halfDays = 0,
  onLeave = 0,
  lateHours = 0,
  overtimeHours = 0,
  notMarked = 0,
  className = "",
}) {
  const items = [
    {
      id: "present",
      label: "Present",
      value: present,
      unit: "d",
      hero: true,
      tone: "default",
    },
    {
      id: "absent",
      label: "Absent",
      value: absent,
      unit: "d",
      tone: absent > 0 ? "alert" : "muted",
    },
    {
      id: "halfDays",
      label: "Half days",
      value: halfDays,
      unit: "d",
      tone: halfDays > 0 ? "warning" : "muted",
    },
    {
      id: "onLeave",
      label: "On leave",
      value: onLeave,
      unit: "d",
      tone: onLeave > 0 ? "accent" : "muted",
    },
    {
      id: "lateHours",
      label: "Late cut",
      value: `${lateHours}h`,
      rawVal: lateHours,
      tone: lateHours > 0 ? "warning" : "muted",
    },
    {
      id: "overtime",
      label: "Overtime",
      value: `${overtimeHours}h`,
      rawVal: overtimeHours,
      tone: overtimeHours > 0 ? "positive" : "muted",
    },
    {
      id: "notMarked",
      label: "Not marked",
      value: notMarked,
      unit: "d",
      tone: notMarked > 0 ? "warning" : "muted",
    },
  ];

  return (
    <div
      className={`w-full overflow-x-auto py-3 border-y border-[#E9E9F1] dark:border-gray-800 bg-transparent ${className}`}
    >
      <div className="flex items-stretch divide-x divide-[#E9E9F1] dark:divide-gray-800/80 min-w-[680px]">
        {items.map((stat) => {
          let valueColor = "text-[#101323] dark:text-gray-100";
          if (stat.tone === "alert") {
            valueColor = "text-[#B42318] dark:text-rose-400 font-semibold";
          } else if (stat.tone === "warning") {
            valueColor = "text-[#B45309] dark:text-amber-500 font-semibold";
          } else if (stat.tone === "accent") {
            valueColor = "text-[#4F46E5] dark:text-indigo-400 font-semibold";
          } else if (stat.tone === "positive") {
            valueColor = "text-[#047857] dark:text-emerald-400 font-semibold";
          } else if (stat.tone === "muted") {
            valueColor = "text-[#6B7280] dark:text-gray-400 font-normal";
          }

          return (
            <div
              key={stat.id}
              className={`flex flex-col justify-between ${
                stat.hero ? "px-6 pr-8 min-w-[120px]" : "px-5 min-w-[90px]"
              }`}
            >
              <div
                className={`tabular-nums tracking-tight leading-none ${
                  stat.hero
                    ? "text-[28px] font-semibold text-[#101323] dark:text-white"
                    : `text-[20px] font-medium ${valueColor}`
                }`}
              >
                {stat.value}
              </div>
              <div className="text-xs font-medium text-[#6B7280] dark:text-gray-400 mt-2 truncate">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
