"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Coins, Plus, ExternalLink } from "lucide-react";
import { Ledger } from "./Ledger";
import { ComponentRow } from "./ComponentRow";

export function SalaryTab({
  basicSalary,
  onBasicSalaryChange,
  earnings,
  onEarningChange,
  deductions,
  className = "",
}) {
  const [isTouched, setIsTouched] = useState(false);

  const handleBasicChange = (e) => {
    setIsTouched(true);
    let raw = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 2) {
      raw = parts[0] + "." + parts[1].slice(0, 2);
    }
    const val = raw === "" ? 0 : parseFloat(raw);
    onBasicSalaryChange(val);
  };

  const isBasicZero = (!basicSalary || Number(basicSalary) <= 0) && isTouched;
  const activeCount = (earnings || []).filter((e) => e.isIncluded).length;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in ${className}`}>
      {/* LEFT 62% — Cards */}
      <div className="lg:col-span-7 space-y-6">
        {/* Basic Pay Card */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Basic Pay
            </h3>
            <span className="text-xs font-mono text-slate-400">FOUNDATION PAY</span>
          </div>
          <div className="p-5 space-y-3">
            <label
              htmlFor="monthly-basic-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Base Salary (₹ per month)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none pointer-events-none">
                ₹
              </span>
              <input
                id="monthly-basic-input"
                type="text"
                inputMode="decimal"
                value={basicSalary === 0 ? "" : basicSalary}
                placeholder="0"
                onChange={handleBasicChange}
                onBlur={() => setIsTouched(true)}
                onWheel={(e) => e.target.blur()}
                className={`w-full h-10 pl-8 pr-3.5 text-left text-base font-bold tabular-nums rounded-lg border ${
                  isBasicZero
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20"
                } bg-white text-slate-900 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all`}
              />
            </div>
            {isBasicZero ? (
              <p className="text-xs text-red-600 font-medium">
                Enter monthly basic pay (must be greater than zero)
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Percentage-based allowances (DA, HRA) and statutory PF are computed automatically from this amount.
              </p>
            )}
          </div>
        </div>

        {/* Earnings Components Card */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Earnings &amp; Allowances
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {activeCount} active
              </span>
            </div>
            <Link
              href="/admin/hr/salary-components"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              <span>Manage Components</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div className="p-5 divide-y divide-slate-100">
            {(earnings || []).length > 0 ? (
              earnings.map((item, index) => (
                <ComponentRow
                  key={item.componentId || item._id || index}
                  item={item}
                  basicSalary={basicSalary}
                  onChange={(updated) => onEarningChange(index, updated)}
                />
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No earning components configured. Add allowances in Salary Components settings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT 38% — Sticky Ledger */}
      <div className="lg:col-span-5">
        <Ledger
          basicSalary={basicSalary}
          earnings={earnings}
          deductions={deductions}
        />
      </div>
    </div>
  );
}
