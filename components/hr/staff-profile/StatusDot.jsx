"use client";

import React from "react";

const TONE_STYLES = {
  positive: {
    dot: "bg-[#047857]",
    ring: "border-[#047857]",
    text: "text-[#047857] dark:text-emerald-400 font-medium",
  },
  warning: {
    dot: "bg-[#B45309]",
    ring: "border-[#B45309]",
    text: "text-[#B45309] dark:text-amber-400 font-medium",
  },
  alert: {
    dot: "bg-[#B42318]",
    ring: "border-[#B42318]",
    text: "text-[#B42318] dark:text-rose-400 font-semibold",
  },
  accent: {
    dot: "bg-[#4F46E5]",
    ring: "border-[#4F46E5]",
    text: "text-[#4F46E5] dark:text-indigo-400 font-medium",
  },
  muted: {
    dot: "bg-[#6B7280]",
    ring: "border-[#6B7280]",
    text: "text-[#6B7280] dark:text-gray-400",
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
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
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
