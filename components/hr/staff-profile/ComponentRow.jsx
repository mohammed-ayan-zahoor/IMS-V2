"use client";

import React, { useState, useEffect } from "react";
import { Money } from "./Money";
import { EmptyValue } from "./EmptyValue";

export function ComponentRow({
  item,
  basicSalary = 0,
  onChange,
  className = "",
}) {
  const isPercentage = item.calculationType === "percentage";
  const ruleAmount = isPercentage
    ? Math.round((Number(basicSalary || 0) * (Number(item.defaultValue || 0))) / 100)
    : Number(item.defaultValue || 0);

  const [isOverridden, setIsOverridden] = useState(
    item.isOverridden || (!isPercentage && item.amount !== item.defaultValue)
  );

  useEffect(() => {
    if (isPercentage && !isOverridden && item.isIncluded) {
      if (item.amount !== ruleAmount) {
        onChange({
          ...item,
          amount: ruleAmount,
          isOverridden: false,
        });
      }
    }
  }, [basicSalary, isPercentage, isOverridden, ruleAmount]);

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    onChange({
      ...item,
      isIncluded: checked,
      amount: checked ? (isPercentage && !isOverridden ? ruleAmount : item.amount || ruleAmount) : 0,
    });
  };

  const handleOverrideToggle = () => {
    setIsOverridden(true);
    onChange({
      ...item,
      isOverridden: true,
    });
  };

  const handleResetToAuto = () => {
    setIsOverridden(false);
    onChange({
      ...item,
      isOverridden: false,
      amount: ruleAmount,
    });
  };

  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 2) {
      raw = parts[0] + "." + parts[1].slice(0, 2);
    }
    onChange({
      ...item,
      amount: raw === "" ? 0 : parseFloat(raw),
      isOverridden: true,
    });
  };

  const isIncluded = !!item.isIncluded;

  return (
    <div
      className={`min-h-[52px] py-2.5 flex items-center justify-between gap-4 border-b border-[#E6E8EC]/80 transition-colors ${className}`}
    >
      {/* Checkbox + Details */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isIncluded}
          onChange={handleCheckboxChange}
          aria-label={`Include ${item.name}`}
          className="mt-1 w-4 h-4 rounded text-[#4F46E5] border-[#D1D5DB] focus:ring-[#4F46E5] focus:ring-offset-1 shrink-0 cursor-pointer accent-[#4F46E5]"
        />

        <div className="min-w-0">
          <div
            className={`text-[13px] leading-snug ${
              isIncluded
                ? "font-semibold text-[#14161A]"
                : "font-medium text-[#5F6673]"
            }`}
          >
            {item.name}
          </div>

          <div className="text-[12px] text-[#5F6673] mt-0.5 flex flex-wrap items-center gap-1.5 font-normal">
            {isPercentage ? (
              <>
                <span>
                  {item.defaultValue}% of basic ({item.percentageBasis || "basic"})
                </span>
                {isIncluded && (
                  <>
                    <span>·</span>
                    {isOverridden ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[#B45309] font-medium">Custom</span>
                        <span>(rule gives ₹{ruleAmount.toLocaleString("en-IN")})</span>
                        <button
                          type="button"
                          onClick={handleResetToAuto}
                          className="text-[#4F46E5] hover:underline font-semibold cursor-pointer ml-1"
                        >
                          Reset
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOverrideToggle}
                        className="text-[#4F46E5] hover:underline font-medium cursor-pointer"
                      >
                        Override
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <span>
                Flat · default ₹{Number(item.defaultValue || 0).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount Display or Input */}
      <div className="shrink-0 flex items-center justify-end">
        {!isIncluded ? (
          <div className="w-[130px] text-right">
            <EmptyValue />
          </div>
        ) : isPercentage && !isOverridden ? (
          <div className="w-[130px] text-right text-[13px] font-semibold text-[#14161A] tabular-nums">
            <Money value={ruleAmount} fixed />
          </div>
        ) : (
          <div className="relative w-[130px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#5F6673] select-none pointer-events-none">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={item.amount === 0 ? "" : item.amount}
              placeholder="0"
              onChange={handleInputChange}
              onWheel={(e) => e.target.blur()}
              className="w-full h-8 pl-6 pr-2.5 text-right text-[13px] font-semibold tabular-nums rounded-lg border border-[#E6E8EC] bg-white text-[#14161A] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
