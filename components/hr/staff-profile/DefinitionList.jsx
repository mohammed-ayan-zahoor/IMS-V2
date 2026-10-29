"use client";

import React from "react";
import { EmptyValue } from "./EmptyValue";

export function DefinitionList({ eyebrow, action, children, className = "" }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      {eyebrow && (
        <div className="flex items-center justify-between pt-4 pb-2 border-b border-[#E6E8EC]">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-[#5F6673] uppercase">
            {eyebrow}
          </span>
          {action}
        </div>
      )}
      <div className="divide-y divide-[#E6E8EC]/80">
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
      className={`min-h-[44px] py-2.5 flex items-baseline justify-between gap-4 text-[13px] ${className}`}
    >
      <div className="flex items-baseline gap-4 min-w-0 flex-1">
        <span className="w-[168px] shrink-0 text-[12px] font-medium text-[#5F6673]">
          {label}
        </span>
        <div
          className={`min-w-0 flex-1 text-[13px] font-medium text-[#14161A] ${
            mono ? "font-mono text-[12px] tracking-tight" : ""
          } ${valueClassName}`}
        >
          {isValueEmpty ? <EmptyValue /> : value}
        </div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}
