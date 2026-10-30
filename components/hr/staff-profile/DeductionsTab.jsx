"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, AlertCircle } from "lucide-react";
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
  const activeCount = (deductions || []).filter((d) => d.isIncluded).length;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in ${className}`}>
      {/* LEFT 62% — Cards */}
      <div className="lg:col-span-7 space-y-6">
        {/* Deductions Card */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Statutory &amp; Recurring Deductions
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

          <div className="p-5">
            {/* Explainer Disclosure */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setIsExplainerOpen(!isExplainerOpen)}
                className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>How are biometric late cuts and advances handled?</span>
                {isExplainerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isExplainerOpen && (
                <div className="mt-2 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                  <AlertCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Variable items — attendance LWP, late-in penalties, performance cuts and advance recovery — are applied monthly during payslip generation from biometric logs.
                  </span>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {(deductions || []).length > 0 ? (
                deductions.map((item, index) => (
                  <ComponentRow
                    key={item.componentId || item._id || index}
                    item={item}
                    basicSalary={basicSalary}
                    onChange={(updated) => onDeductionChange(index, updated)}
                  />
                ))
              ) : (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700">
                    No deduction components configured
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Add PF, ESI or Professional Tax once in Salary Components and they will appear here.
                  </p>
                  <Link
                    href="/admin/hr/salary-components"
                    className="inline-flex items-center h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs mt-2"
                  >
                    Open Salary Components
                  </Link>
                </div>
              )}
            </div>
          </div>
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
