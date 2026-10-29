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
      <div className="h-8 inline-flex items-center rounded-lg border border-[#E6E8EC] bg-[#F2F3F5] overflow-hidden divide-x divide-[#E6E8EC]">
        <button
          type="button"
          onClick={handlePrev}
          title="Previous month"
          aria-label="Previous month"
          className="h-full px-2.5 text-[#14161A] hover:bg-[#EBECEF] transition-colors flex items-center justify-center cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-[#5F6673]" />
        </button>

        <span className="h-full px-3.5 text-[12px] font-semibold text-[#14161A] flex items-center justify-center min-w-[130px] tabular-nums select-none">
          {formattedLabel}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={isFutureMonth}
          title="Next month"
          aria-label="Next month"
          className="h-full px-2.5 text-[#14161A] hover:bg-[#EBECEF] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-[#5F6673]" />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={handleToday}
          className="text-[12px] font-semibold text-[#4F46E5] hover:underline px-1 py-1 cursor-pointer"
        >
          This month
        </button>
      )}
    </div>
  );
}
