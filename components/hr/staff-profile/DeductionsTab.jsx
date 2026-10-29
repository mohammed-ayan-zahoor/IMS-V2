"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Ledger } from "./Ledger";
import { ComponentRow } from "./ComponentRow";

export function DeductionsTab({
  basicSalary = 0,
  earnings = [],
  deductions = [],
  onDeductionChange,
  className = "",
}) {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${className}`}>
      {/* LEFT 62% — Deductions list */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[#14161A]">
            Statutory deductions
          </h2>
          <p className="text-[13px] text-[#5F6673] mt-0.5">
            Fixed monthly deductions applied to every payslip.
          </p>

          {/* Inline Disclosure */}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setIsExplainerOpen(!isExplainerOpen)}
              className="text-[13px] font-semibold text-[#4F46E5] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>How are late cuts and advances handled?</span>
              {isExplainerOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isExplainerOpen && (
              <p className="mt-2 p-3 rounded-lg bg-[#F2F3F5] border border-[#E6E8EC] text-[12px] text-[#14161A] leading-relaxed">
                Variable items — attendance LWP, late-in penalties, performance cuts and advance recovery — are applied per month when a payslip is generated based on biometric logs and gate passes.
              </p>
            )}
          </div>
        </div>

        {/* Deductions Group */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E8EC]">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-[#5F6673] uppercase">
              RECURRING DEDUCTIONS
            </span>
            {(deductions || []).length > 0 && (
              <span className="text-[12px] text-[#5F6673]">
                Uncheck a component to exempt this staff member
              </span>
            )}
          </div>

          {(deductions || []).length > 0 ? (
            <div className="divide-y divide-[#E6E8EC]/80">
              {deductions.map((item, index) => (
                <ComponentRow
                  key={item.componentId || item._id || index}
                  item={item}
                  basicSalary={basicSalary}
                  onChange={(updated) => onDeductionChange(index, updated)}
                />
              ))}
            </div>
          ) : (
            /* Unboxed, left-aligned empty state */
            <div className="py-8 space-y-2 text-left">
              <h3 className="text-[14px] font-semibold text-[#14161A]">
                No deduction components set up
              </h3>
              <p className="text-[13px] text-[#5F6673] max-w-md">
                Add PF, ESI or Professional Tax once and they&apos;ll appear here for every staff member.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/hr/salary-components"
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[13px] font-medium text-[#14161A] transition-colors"
                >
                  Open Earnings &amp; Deductions
                </Link>
              </div>
            </div>
          )}

          {(deductions || []).length > 0 && (
            <div className="pt-4">
              <Link
                href="/admin/hr/salary-components"
                className="text-[13px] font-semibold text-[#4F46E5] hover:underline inline-flex items-center gap-1"
              >
                Manage components in Earnings &amp; Deductions →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT 38% — Same Sticky Ledger */}
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
