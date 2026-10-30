"use client";

import React from "react";

export function InfoRow({ label, value, icon: Icon, action, className = "" }) {
  const isValueEmpty = value === null || value === undefined || value === "";

  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-slate-50 last:border-0 ${className}`}
    >
      <div className="flex items-center gap-2.5 text-slate-400 text-sm font-medium min-w-0">
        {Icon && <Icon size={15} className="shrink-0 text-slate-400" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-700 text-right flex items-center gap-2 shrink-0">
        {isValueEmpty ? (
          <span className="text-slate-300 italic font-medium">Not provided</span>
        ) : (
          value
        )}
        {action}
      </div>
    </div>
  );
}
