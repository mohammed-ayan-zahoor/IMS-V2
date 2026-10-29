"use client";

import React from "react";
import Link from "next/link";
import { Money } from "./Money";

export function Ledger({
  basicSalary = 0,
  earnings = [],
  deductions = [],
  className = "",
}) {
  const enabledEarnings = (earnings || []).filter(
    (e) => e.isIncluded && Number(e.amount) > 0
  );
  const totalEarnings = enabledEarnings.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const grossSalary = Number(basicSalary || 0) + totalEarnings;

  const enabledDeductions = (deductions || []).filter(
    (d) => d.isIncluded && Number(d.amount) > 0
  );
  const totalDeductions = enabledDeductions.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );
  const estNetSalary = Math.max(0, grossSalary - totalDeductions);

  return (
    <aside
      className={`sticky top-24 bg-[#0F172A] text-white rounded-[12px] p-5 sm:p-6 shadow-xl border border-slate-800/80 z-10 ${className}`}
      aria-label="Estimated monthly pay summary"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="text-xs font-semibold tracking-wide uppercase text-white/60">
          Estimated monthly pay
        </h3>
        <span className="text-[11px] font-mono text-white/40">INR</span>
      </div>

      <div className="py-3.5 space-y-2 text-[13px] max-h-[360px] overflow-y-auto pr-1">
        {/* Basic Pay */}
        <div className="flex items-center justify-between">
          <span className="text-white/70">Basic pay</span>
          <Money value={basicSalary} fixed className="text-white" />
        </div>

        {/* Enabled Earnings */}
        {enabledEarnings.map((item, idx) => (
          <div
            key={item.componentId || item._id || idx}
            className="flex items-center justify-between transition-colors duration-300"
          >
            <span className="text-white/70 truncate max-w-[190px]" title={item.name}>
              {item.name}
            </span>
            <Money value={item.amount} fixed className="text-white shrink-0 ml-2" />
          </div>
        ))}
      </div>

      {/* Gross Salary Row */}
      <div className="pt-3 pb-3 border-t border-white/10 flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase text-white/80">
          Gross
        </span>
        <Money
          value={grossSalary}
          fixed
          className="text-lg sm:text-[20px] font-semibold text-white tracking-tight"
        />
      </div>

      {/* Deductions section */}
      <div className="py-2.5 border-t border-white/10 space-y-2 text-[13px]">
        <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-1">
          Deductions
        </div>

        {enabledDeductions.length > 0 ? (
          enabledDeductions.map((item, idx) => (
            <div
              key={item.componentId || item._id || idx}
              className="flex items-center justify-between text-rose-300/90"
            >
              <span className="truncate max-w-[190px]" title={item.name}>
                {item.name}
              </span>
              <span className="tabular-nums font-medium shrink-0 ml-2">
                −<Money value={item.amount} fixed className="text-rose-300 inline" />
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>None set up</span>
            <Link
              href="/admin/hr/salary-components"
              className="text-indigo-300 hover:text-indigo-200 transition-colors underline text-[11px]"
            >
              Configure →
            </Link>
          </div>
        )}
      </div>

      {/* Est. Net Take-Home */}
      <div className="pt-4 mt-2 border-t border-white/10">
        <div className="text-xs font-medium text-white/60 mb-1">
          Est. net take-home
        </div>
        <div className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#34D399] leading-tight">
          <Money value={estNetSalary} fixed className="text-[#34D399]" />
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-4 pt-3 border-t border-white/10 text-[11px] leading-relaxed text-white/50">
        Excludes attendance cuts and overtime, which are applied when a payslip is generated.
      </p>
    </aside>
  );
}
