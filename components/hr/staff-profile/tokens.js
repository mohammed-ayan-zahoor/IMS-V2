// Apple Design & Staff Directory unified design tokens
export const TOKENS = {
  // Page & surfaces
  bgPage: "#F8F9FA",
  surface: "#FFFFFF",
  bgSubtle: "#F2F3F5",
  bgHover: "#EBECEF",

  // Borders (hairline 1px)
  borderSubtle: "#E6E8EC",
  borderInput: "#D1D5DB",
  borderFocus: "#4F46E5",

  // Typography - Razor sharp contrast
  textPrimary: "#14161A",   // Near-black, 14.5:1 contrast
  textSecondary: "#5F6673", // Slate gray, 5.2:1 contrast (WCAG AAA)
  textTertiary: "#7E8695",  // Metadata
  textInverse: "#FFFFFF",

  // Brand Accent (Apple Indigo)
  accent: "#4F46E5",
  accentHover: "#4338CA",
  accentTint: "#EEF0FF",

  // Semantic Status Tones
  positive: "#047857",
  positiveTint: "#E6F4EA",
  warning: "#B45309",
  warningTint: "#FEF3C7",
  alert: "#DC2626",
  alertTint: "#FEE2E2",

  // Dark Ledger Panel
  ink: "#111827",
  inkBorder: "#1F2937",
  onInkSecondary: "#9CA3AF",
  positiveOnInk: "#34D399",
};

export const SPRING_FAST = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const SPRING_SMOOTH = {
  type: "spring",
  bounce: 0,
  duration: 0.35,
};
