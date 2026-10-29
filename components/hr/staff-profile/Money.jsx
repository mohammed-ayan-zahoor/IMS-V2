"use client";

import React from "react";
import { EmptyValue } from "./EmptyValue";

const inrFormatterStandard = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrFormatterFixed = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Money({ value, fixed = false, className = "" }) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return <EmptyValue className={className} />;
  }

  let num = Number(value);
  // Normalize -0 to 0
  if (Object.is(num, -0) || num === 0) {
    num = 0;
  }

  const formatter = fixed ? inrFormatterFixed : inrFormatterStandard;
  const formatted = formatter.format(num);

  return (
    <span className={`tabular-nums font-medium ${className}`}>
      {formatted}
    </span>
  );
}
