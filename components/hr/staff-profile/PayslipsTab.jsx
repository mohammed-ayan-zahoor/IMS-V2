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
          <h2 className="text-[17px] font-semibold tracking-tight text-[#14161A]">
            Payslips
          </h2>
          {payslips.length > 0 && (
            <span className="text-[12px] font-mono text-[#5F6673] tabular-nums bg-[#F2F3F5] px-2 py-0.5 rounded-full font-semibold border border-[#E6E8EC]">
              {payslips.length}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#5F6673] mt-0.5">
          Official salary slips generated for this employee.
        </p>
      </div>

      {sortedPayslips.length > 0 ? (
        <div className="pt-1">
          <div className="w-full overflow-x-auto rounded-xl bg-white border border-[#E6E8EC] shadow-xs">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-[#E6E8EC] text-[11px] font-semibold text-[#5F6673] uppercase tracking-wider bg-[#F8F9FA]">
                  <th className="py-3 px-4 w-[120px]">Period</th>
                  <th className="py-3 px-4 text-right w-[120px]">Basic</th>
                  <th className="py-3 px-4 text-right w-[120px]">Gross</th>
                  <th className="py-3 px-4 text-right w-[120px]">Deductions</th>
                  <th className="py-3 px-4 text-right w-[130px]">Net pay</th>
                  <th className="py-3 px-4 w-[120px] pl-6">Status</th>
                  <th className="py-3 px-4 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8EC]/80 text-[13px]">
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
                      className="h-13 hover:bg-[#F2F3F5]/60 transition-colors group"
                    >
                      {/* Period */}
                      <td className="py-3 px-4 font-bold text-[#14161A] whitespace-nowrap">
                        {periodLabel}
                      </td>

                      {/* Basic */}
                      <td className="py-3 px-4 text-right tabular-nums text-[#14161A] font-medium">
                        <Money value={ps.basicSalary} fixed />
                      </td>

                      {/* Gross */}
                      <td className="py-3 px-4 text-right tabular-nums text-[#14161A] font-semibold">
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
                      <td className="py-3 px-4 text-right tabular-nums text-[#14161A] font-medium">
                        <Money value={totalDeductions} fixed />
                      </td>

                      {/* Net Pay */}
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-[#14161A]">
                        <Money value={net} fixed />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 pl-6 whitespace-nowrap">
                        <StatusDot tone={statusTone} label={statusLabel} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap pr-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/hr/payslips/${ps._id}`}
                            className="text-[12px] font-semibold text-[#4F46E5] hover:underline"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handlePrint(e, ps._id)}
                            title="Print payslip"
                            aria-label={`Print payslip for ${periodLabel}`}
                            className="p-1 rounded text-[#5F6673] hover:text-[#14161A] transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
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
                className="h-8 px-4 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[12px] font-semibold text-[#14161A] transition-colors cursor-pointer"
              >
                Show older payslips ({sortedPayslips.length - visiblePayslips.length} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Unboxed Left-Aligned Empty State */
        <div className="py-8 space-y-2 text-left">
          <h3 className="text-[14px] font-semibold text-[#14161A]">
            No payslips yet
          </h3>
          <p className="text-[13px] text-[#5F6673] max-w-md leading-relaxed">
            A salary structure and attendance for the month are needed before issuing monthly salary slips.
          </p>
          <div className="pt-2">
            <Link
              href={`/admin/hr/payslips?staff=${staffId}`}
              className="inline-flex items-center h-8 px-4 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white text-[13px] font-semibold shadow-xs transition-all cursor-pointer"
            >
              Generate payslip
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
