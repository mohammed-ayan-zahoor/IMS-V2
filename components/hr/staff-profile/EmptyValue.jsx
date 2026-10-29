"use client";

import React from "react";

export function EmptyValue({ className = "" }) {
  return (
    <span
      className={`text-[#6B7280] dark:text-gray-400 select-none ${className}`}
      aria-label="Not provided"
    >
      —
    </span>
  );
}
