"use client";

import React, { useState } from "react";
import Link from "next/link";
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

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${className}`}>
      {/* LEFT 62% — Builder Rows */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[#14161A]">
            Monthly salary
          </h2>
          <p className="text-[13px] text-[#5F6673] mt-0.5">
            Set basic pay. Percentage-based components are calculated from it.
          </p>
        </div>

        {/* Basic Pay Field */}
        <div className="space-y-1.5 pt-1">
          <label
            htmlFor="monthly-basic-input"
            className="block text-[12px] font-semibold text-[#14161A]"
          >
            Basic pay (monthly)
          </label>
          <div className="relative max-w-[280px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[#5F6673] select-none pointer-events-none">
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
              className={`w-full h-10 pl-8 pr-3.5 text-left text-[16px] font-semibold tabular-nums rounded-lg border ${
                isBasicZero
                  ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-red-500/20"
                  : "border-[#E6E8EC] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20"
              } bg-white text-[#14161A] focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all`}
            />
          </div>
          {isBasicZero ? (
            <p className="text-[12px] text-[#DC2626] font-medium mt-1">
              Enter the monthly basic pay (must be greater than zero)
            </p>
          ) : (
            <p className="text-[12px] text-[#5F6673]">
              Serves as the foundation for PF, HRA, and percentage allowances.
            </p>
          )}
        </div>

        {/* Earnings Group */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E8EC]">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-[#5F6673] uppercase">
              EARNINGS
            </span>
            <span className="text-[12px] font-medium text-[#5F6673]">
              {(earnings || []).filter((e) => e.isIncluded).length} active
            </span>
          </div>

          <div className="divide-y divide-[#E6E8EC]/80">
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
              <div className="py-8 text-center text-[13px] text-[#5F6673]">
                No earning components assigned yet.
              </div>
            )}
          </div>

          <div className="pt-4">
            <Link
              href="/admin/hr/salary-components"
              className="text-[13px] font-semibold text-[#4F46E5] hover:underline inline-flex items-center gap-1"
            >
              Manage components in Earnings &amp; Deductions →
            </Link>
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
