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
      className={`sticky top-20 bg-[#111827] text-white rounded-xl p-5 sm:p-6 shadow-xl border border-slate-800 z-10 ${className}`}
      aria-label="Estimated monthly pay summary"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
          Estimated monthly pay
        </h3>
        <span className="text-[11px] font-mono text-slate-400">INR</span>
      </div>

      <div className="py-3.5 space-y-2 text-[13px] max-h-[340px] overflow-y-auto pr-1">
        {/* Basic Pay */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Basic pay</span>
          <Money value={basicSalary} fixed className="text-white font-medium" />
        </div>

        {/* Enabled Earnings */}
        {enabledEarnings.map((item, idx) => (
          <div
            key={item.componentId || item._id || idx}
            className="flex items-center justify-between transition-colors"
          >
            <span className="text-slate-300 truncate max-w-[190px]" title={item.name}>
              {item.name}
            </span>
            <Money value={item.amount} fixed className="text-white font-medium shrink-0 ml-2" />
          </div>
        ))}
      </div>

      {/* Gross Salary Row */}
      <div className="pt-3 pb-3 border-t border-white/10 flex items-baseline justify-between">
        <span className="text-[12px] font-bold tracking-wide uppercase text-slate-200">
          Gross
        </span>
        <Money
          value={grossSalary}
          fixed
          className="text-lg sm:text-[19px] font-bold text-white tracking-tight"
        />
      </div>

      {/* Deductions section */}
      <div className="py-2.5 border-t border-white/10 space-y-2 text-[13px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Deductions
        </div>

        {enabledDeductions.length > 0 ? (
          enabledDeductions.map((item, idx) => (
            <div
              key={item.componentId || item._id || idx}
              className="flex items-center justify-between text-rose-300"
            >
              <span className="truncate max-w-[190px]" title={item.name}>
                {item.name}
              </span>
              <span className="tabular-nums font-semibold shrink-0 ml-2">
                −<Money value={item.amount} fixed className="text-rose-300 inline" />
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between text-[12px] text-slate-400">
            <span>None set up</span>
            <Link
              href="/admin/hr/salary-components"
              className="text-indigo-400 hover:text-indigo-300 transition-colors underline text-[11px] font-medium"
            >
              Configure →
            </Link>
          </div>
        )}
      </div>

      {/* Est. Net Take-Home */}
      <div className="pt-4 mt-2 border-t border-white/10">
        <div className="text-[12px] font-medium text-slate-400 mb-1">
          Est. net take-home
        </div>
        <div className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#34D399] leading-tight">
          <Money value={estNetSalary} fixed className="text-[#34D399]" />
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-4 pt-3 border-t border-white/10 text-[11px] leading-relaxed text-slate-400">
        Excludes attendance cuts and overtime, which are applied when a payslip is generated.
      </p>
    </aside>
  );
}
