"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, AlertTriangle, ExternalLink, FileSpreadsheet } from "lucide-react";
import { Money } from "./Money";
import { StatusDot } from "./StatusDot";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function PayslipsTab({
  payslips = [],
  staffId,
  className = "",
}) {
  const [displayLimit, setDisplayLimit] = useState(12);

  const sortedPayslips = [...payslips].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (b.month || 1) - (a.month || 1);
  });

  const visiblePayslips = sortedPayslips.slice(0, displayLimit);
  const hasMore = sortedPayslips.length > displayLimit;

  const handlePrint = (e, psId) => {
    e.stopPropagation();
    window.open(`/admin/hr/payslips/${psId}?print=true`, "_blank");
  };

  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {/* Header Card */}
      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Official Payslips
            </h3>
            {payslips.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {payslips.length}
              </span>
            )}
          </div>
          <Link
            href={`/admin/hr/payslips?staff=${staffId}`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <span>Issue New Payslip</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {sortedPayslips.length > 0 ? (
          <div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-5 w-[140px]">Period</th>
                    <th className="py-3 px-4 text-right w-[120px]">Basic</th>
                    <th className="py-3 px-4 text-right w-[120px]">Gross</th>
                    <th className="py-3 px-4 text-right w-[120px]">Deductions</th>
                    <th className="py-3 px-4 text-right w-[130px]">Net pay</th>
                    <th className="py-3 px-4 w-[120px] pl-6">Status</th>
                    <th className="py-3 px-5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {visiblePayslips.map((ps) => {
                    const monthIndex = (ps.month || 1) - 1;
                    const periodLabel = `${MONTH_NAMES[monthIndex] || "Month"} ${ps.year}`;

                    const totalEarnings = (ps.earnings || []).reduce(
                      (sum, e) => sum + (Number(e.amount) || 0),
                      0
                    );
                    const calculatedGross =
                      ps.grossSalary != null
                        ? Number(ps.grossSalary)
                        : Number(ps.basicSalary || 0) + totalEarnings;

                    const totalDeductions =
                      ps.totalDeductions != null
                        ? Number(ps.totalDeductions)
                        : (ps.deductions || []).reduce(
                            (sum, d) => sum + (Number(d.amount) || 0),
                            0
                          );

                    const net = Number(ps.netSalary || 0);

                    const isGrossMissing =
                      calculatedGross === 0 && (net > 0 || totalEarnings > 0);

                    const status = ps.paymentStatus || ps.status || "generated";
                    const statusTone =
                      status === "paid"
                        ? "positive"
                        : status === "draft"
                        ? "muted"
                        : "accent";

                    const statusLabel =
                      status === "paid"
                        ? "Paid"
                        : status === "draft"
                        ? "Draft"
                        : "Generated";

                    return (
                      <tr
                        key={ps._id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Period */}
                        <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap">
                          {periodLabel}
                        </td>

                        {/* Basic */}
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-700 font-medium">
                          <Money value={ps.basicSalary} fixed />
                        </td>

                        {/* Gross */}
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-900 font-bold">
                          {isGrossMissing ? (
                            <span
                              className="inline-flex items-center gap-1 text-amber-600 font-medium"
                              title="Gross wasn't saved on this payslip"
                            >
                              <span>—</span>
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <Money value={calculatedGross} fixed />
                          )}
                        </td>

                        {/* Deductions */}
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-700 font-medium">
                          <Money value={totalDeductions} fixed />
                        </td>

                        {/* Net Pay */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-bold text-slate-900">
                          <Money value={net} fixed />
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 pl-6 whitespace-nowrap">
                          <StatusDot tone={statusTone} label={statusLabel} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap pr-5">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/hr/payslips/${ps._id}`}
                              className="text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => handlePrint(e, ps._id)}
                              title="Print payslip"
                              aria-label={`Print payslip for ${periodLabel}`}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="p-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  className="h-8 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Show older payslips ({sortedPayslips.length - visiblePayslips.length} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State matching clean card design */
          <div className="py-12 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                No payslips yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                A salary structure and biometric attendance are used to generate official salary slips for this employee.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/admin/hr/payslips?staff=${staffId}`}
                className="inline-flex items-center h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Generate payslip
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
