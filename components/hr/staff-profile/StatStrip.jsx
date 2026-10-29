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
      className={`w-full overflow-x-auto p-4 rounded-xl bg-white border border-[#E6E8EC] shadow-xs ${className}`}
    >
      <div className="flex items-stretch divide-x divide-[#E6E8EC] min-w-[680px]">
        {items.map((stat) => {
          let valueColor = "text-[#14161A]";
          if (stat.tone === "alert") {
            valueColor = "text-[#DC2626] font-bold";
          } else if (stat.tone === "warning") {
            valueColor = "text-[#B45309] font-bold";
          } else if (stat.tone === "accent") {
            valueColor = "text-[#4F46E5] font-bold";
          } else if (stat.tone === "positive") {
            valueColor = "text-[#047857] font-bold";
          } else if (stat.tone === "muted") {
            valueColor = "text-[#7E8695] font-medium";
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
                    ? "text-[28px] font-bold text-[#14161A]"
                    : `text-[20px] ${valueColor}`
                }`}
              >
                {stat.value}
              </div>
              <div className="text-[12px] font-semibold text-[#5F6673] mt-2 truncate">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
