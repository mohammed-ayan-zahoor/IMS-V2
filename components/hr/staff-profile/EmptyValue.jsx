"use client";

import React from "react";

export function EmptyValue({ className = "" }) {
  return (
    <span
      className={`text-[#7E8695] select-none font-normal ${className}`}
      aria-label="Not provided"
    >
      —
    </span>
  );
}
