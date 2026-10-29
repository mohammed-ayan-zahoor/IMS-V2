"use client";

import React from "react";
import { EmptyValue } from "./EmptyValue";

export function DefinitionList({ eyebrow, action, children, className = "" }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      {eyebrow && (
        <div className="flex items-center justify-between pt-4 pb-2 border-b border-[#E9E9F1] dark:border-gray-800/80">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-[#6B7280] dark:text-gray-400 uppercase">
            {eyebrow}
          </span>
          {action}
        </div>
      )}
      <div className="divide-y divide-[#E9E9F1] dark:divide-gray-800/60">
        {children}
      </div>
    </div>
  );
}

export function DefinitionRow({
  label,
  value,
  action,
  mono = false,
  className = "",
  valueClassName = "",
}) {
  const isValueEmpty = value === null || value === undefined || value === "";

  return (
    <div
      className={`min-h-[44px] py-2.5 flex items-baseline justify-between gap-4 text-sm ${className}`}
    >
      <div className="flex items-baseline gap-4 min-w-0 flex-1">
        <span className="w-[168px] shrink-0 text-xs font-medium text-[#6B7280] dark:text-gray-400">
          {label}
        </span>
        <div
          className={`min-w-0 flex-1 text-sm font-medium text-[#101323] dark:text-gray-100 ${
            mono ? "font-mono text-[13px] tracking-tight" : ""
          } ${valueClassName}`}
        >
          {isValueEmpty ? <EmptyValue /> : value}
        </div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}
