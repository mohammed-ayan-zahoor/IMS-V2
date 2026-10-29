"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, AlertTriangle } from "lucide-react";
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#101323] dark:text-gray-100">
            Payslips
          </h2>
          {payslips.length > 0 && (
            <span className="text-xs font-mono text-[#6B7280] dark:text-gray-400 tabular-nums">
              {payslips.length}
            </span>
          )}
        </div>
        <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
          Official salary slips generated for this employee.
        </p>
      </div>

      {sortedPayslips.length > 0 ? (
        <div className="pt-2">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-[#E9E9F1] dark:border-gray-800 text-xs text-[#6B7280] dark:text-gray-400">
                  <th className="py-2.5 font-medium w-[120px]">Period</th>
                  <th className="py-2.5 font-medium text-right w-[120px]">Basic</th>
                  <th className="py-2.5 font-medium text-right w-[120px]">Gross</th>
                  <th className="py-2.5 font-medium text-right w-[120px]">Deductions</th>
                  <th className="py-2.5 font-medium text-right w-[130px]">Net pay</th>
                  <th className="py-2.5 font-medium w-[110px] pl-6">Status</th>
                  <th className="py-2.5 font-medium text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E9F1]/80 dark:divide-gray-800/60 text-xs">
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

                  // Data integrity check: if gross is 0 but net is > 0
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
                      className="h-12 hover:bg-[#F1F1F8] dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      {/* Period */}
                      <td className="py-2.5 font-semibold text-[#101323] dark:text-gray-100 whitespace-nowrap">
                        {periodLabel}
                      </td>

                      {/* Basic */}
                      <td className="py-2.5 text-right tabular-nums text-[#101323] dark:text-gray-200">
                        <Money value={ps.basicSalary} fixed />
                      </td>

                      {/* Gross */}
                      <td className="py-2.5 text-right tabular-nums text-[#101323] dark:text-gray-200">
                        {isGrossMissing ? (
                          <span
                            className="inline-flex items-center gap-1 text-[#B45309] font-medium"
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
                      <td className="py-2.5 text-right tabular-nums text-[#101323] dark:text-gray-200">
                        <Money value={totalDeductions} fixed />
                      </td>

                      {/* Net Pay */}
                      <td className="py-2.5 text-right tabular-nums font-semibold text-[#101323] dark:text-white">
                        <Money value={net} fixed />
                      </td>

                      {/* Status */}
                      <td className="py-2.5 pl-6 whitespace-nowrap">
                        <StatusDot tone={statusTone} label={statusLabel} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-right whitespace-nowrap pr-2">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/hr/payslips/${ps._id}`}
                            className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handlePrint(e, ps._id)}
                            title="Print payslip"
                            aria-label={`Print payslip for ${periodLabel}`}
                            className="p-1 rounded text-[#6B7280] hover:text-[#101323] dark:hover:text-white transition-colors cursor-pointer"
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
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 12)}
                className="h-8 px-4 rounded-[8px] border border-[#8E93A8]/40 hover:bg-[#F1F1F8] dark:hover:bg-gray-800 text-xs font-semibold text-[#101323] dark:text-gray-200 transition-colors cursor-pointer"
              >
                Show older payslips ({sortedPayslips.length - visiblePayslips.length} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Unboxed Left-Aligned Empty State */
        <div className="py-8 space-y-2 text-left">
          <h3 className="text-sm font-semibold text-[#101323] dark:text-gray-100">
            No payslips yet
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-gray-400 max-w-md leading-relaxed">
            A salary structure and attendance for the month are needed before issuing monthly salary slips.
          </p>
          <div className="pt-2">
            <Link
              href={`/admin/hr/payslips?staff=${staffId}`}
              className="inline-flex items-center h-8 px-4 rounded-[8px] bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Generate payslip
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
