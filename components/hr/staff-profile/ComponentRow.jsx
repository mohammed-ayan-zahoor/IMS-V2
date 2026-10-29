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

  // Is this item manually overridden?
  const [isOverridden, setIsOverridden] = useState(
    item.isOverridden || (!isPercentage && item.amount !== item.defaultValue)
  );

  // Sync amount when basic changes in auto mode
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
    // Prevent multiple dots
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    // Limit to 2 decimals
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
      className={`min-h-[56px] py-3 flex items-center justify-between gap-4 border-b border-[#E9E9F1] dark:border-gray-800/80 transition-colors ${
        !isIncluded ? "opacity-60" : ""
      } ${className}`}
    >
      {/* Checkbox + Details */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isIncluded}
          onChange={handleCheckboxChange}
          aria-label={`Include ${item.name}`}
          className="mt-1 w-4 h-4 rounded-[5px] border-[#8E93A8] text-[#4F46E5] focus:ring-[#4F46E5] focus:ring-offset-1 shrink-0 cursor-pointer"
        />

        <div className="min-w-0">
          <div
            className={`text-sm font-medium leading-tight ${
              isIncluded
                ? "text-[#101323] dark:text-gray-100"
                : "text-[#6B7280] dark:text-gray-400"
            }`}
          >
            {item.name}
          </div>

          <div className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-1.5">
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
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Custom</span>
                        <span>(rule gives ₹{ruleAmount.toLocaleString("en-IN")})</span>
                        <button
                          type="button"
                          onClick={handleResetToAuto}
                          className="text-[#4F46E5] dark:text-indigo-400 hover:underline font-semibold cursor-pointer ml-1"
                        >
                          Reset
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOverrideToggle}
                        className="text-[#4F46E5] dark:text-indigo-400 hover:underline font-medium cursor-pointer"
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
          <div className="w-[140px] text-right">
            <EmptyValue />
          </div>
        ) : isPercentage && !isOverridden ? (
          <div className="w-[140px] text-right text-sm font-semibold text-[#101323] dark:text-gray-100 tabular-nums">
            <Money value={ruleAmount} fixed />
          </div>
        ) : (
          <div className="relative w-[140px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6B7280] select-none pointer-events-none">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={item.amount === 0 ? "" : item.amount}
              placeholder="0"
              onChange={handleInputChange}
              onWheel={(e) => e.target.blur()}
              className="w-full h-9 pl-7 pr-3 text-right text-sm font-medium tabular-nums rounded-[8px] border border-[#8E93A8] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#101323] dark:text-gray-100 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
