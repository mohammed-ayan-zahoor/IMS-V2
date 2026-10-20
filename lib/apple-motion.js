/**
 * Apple Design System Spring Tokens & Physics Utilities
 * Strict implementation of Apple's fluid interface principles.
 */

export const SPRING = {
  // Default critically damped UI springs (damping 1.0, bounce 0)
  ui:        { type: "spring", bounce: 0,   duration: 0.30 }, // Popovers, modals, sheets
  exit:      { type: "spring", bounce: 0,   duration: 0.22 }, // Slightly faster exit
  highlight: { type: "spring", bounce: 0,   duration: 0.25 }, // Shared highlight glide
  accordion: { type: "spring", bounce: 0,   duration: 0.35 }, // Nav group heights
  move:      { type: "spring", bounce: 0,   duration: 0.40 }, // Inspector slide
  // Flick spring: under-damped only when preceded by a physical flick
  flick:     { type: "spring", bounce: 0.2, duration: 0.30 }, 
  // Quick scale press feedback
  press:     { duration: 0.10, ease: "easeOut" },
  crossfade: { duration: 0.18, ease: "easeInOut" }
};

// Apple exponential-decay projection for flick momentum: where would flick come to rest?
export const project = (v /* px/s */, d = 0.998) => (v / 1000) * d / (1 - d);

// Progressive resistance past boundary
export const rubberband = (over, dim, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over));

export const TOKENS = {
  surface:  "#FFFFFF",
  sidebar:  "#F6F7F9",
  tint:     "#F2F3F5",
  hover:    "#F7F8FA",
  hairline: "#E6E8EC",
  text:     "#14161A",
  text2:    "#5F6673",
  ink:      "#14161A",
  accent:   "#2563EB",
  stLow:    "#D92D20",
  stWarn:   "#D97706",
};
