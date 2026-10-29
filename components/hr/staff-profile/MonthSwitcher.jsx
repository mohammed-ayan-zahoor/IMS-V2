"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export function MonthSwitcher({
  month,
  year,
  onChange,
  className = "",
}) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const isCurrentMonth = month === currentMonth && year === currentYear;
  const isFutureMonth =
    year > currentYear || (year === currentYear && month >= currentMonth);

  const handlePrev = () => {
    let newM = month - 1;
    let newY = year;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    onChange(newM, newY);
  };

  const handleNext = () => {
    if (isFutureMonth) return;
    let newM = month + 1;
    let newY = year;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    onChange(newM, newY);
  };

  const handleToday = () => {
    onChange(currentMonth, currentYear);
  };

  const displayDate = new Date(year, month - 1, 1);
  const formattedLabel = format(displayDate, "MMMM yyyy");

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="h-9 inline-flex items-center rounded-[8px] border border-[#8E93A8]/40 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden divide-x divide-gray-200 dark:divide-gray-800">
        <button
          type="button"
          onClick={handlePrev}
          title="Previous month"
          aria-label="Previous month"
          className="h-full px-2.5 text-[#101323] dark:text-gray-200 hover:bg-[#F1F1F8] dark:hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="h-full px-3.5 text-xs font-semibold text-[#101323] dark:text-gray-100 flex items-center justify-center min-w-[130px] tabular-nums select-none">
          {formattedLabel}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={isFutureMonth}
          title="Next month"
          aria-label="Next month"
          className="h-full px-2.5 text-[#101323] dark:text-gray-200 hover:bg-[#F1F1F8] dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={handleToday}
          className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline px-1 py-1 cursor-pointer"
        >
          This month
        </button>
      )}
    </div>
  );
}
