"use client";

import React from "react";

const TONE_STYLES = {
  positive: {
    dot: "bg-[#047857]",
    ring: "border-[#047857]",
    text: "text-[#047857] font-semibold",
  },
  warning: {
    dot: "bg-[#B45309]",
    ring: "border-[#B45309]",
    text: "text-[#B45309] font-semibold",
  },
  alert: {
    dot: "bg-[#DC2626]",
    ring: "border-[#DC2626]",
    text: "text-[#DC2626] font-semibold",
  },
  accent: {
    dot: "bg-[#4F46E5]",
    ring: "border-[#4F46E5]",
    text: "text-[#4F46E5] font-semibold",
  },
  muted: {
    dot: "bg-[#7E8695]",
    ring: "border-[#7E8695]",
    text: "text-[#5F6673] font-medium",
  },
};

export function StatusDot({
  tone = "muted",
  label,
  variant = "filled",
  className = "",
  labelClassName = "",
}) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.muted;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] leading-tight ${className}`}>
      {variant === "ring" ? (
        <span
          className={`w-1.5 h-1.5 rounded-full border-[1.5px] bg-transparent ${styles.ring} shrink-0`}
          aria-hidden="true"
        />
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0`}
          aria-hidden="true"
        />
      )}
      <span className={`${styles.text} ${labelClassName}`}>{label}</span>
    </span>
  );
}
