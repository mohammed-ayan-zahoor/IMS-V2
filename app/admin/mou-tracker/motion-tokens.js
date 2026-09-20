// Shared motion tokens mirroring the MOU Tracker Motion Spec
export const MOTION_TOKENS = {
    durInstant: 0.08, // 80ms
    durFast: 0.12,    // 120ms
    durBase: 0.18,    // 180ms
    durSlow: 0.24,    // 240ms
    durSheet: 0.28,   // 280ms

    // Easings as cubic-bezier arrays [x1, y1, x2, y2]
    easeOut: [0.16, 1, 0.3, 1],
    easeIn: [0.32, 0, 0.67, 0],
    easeStandard: [0.4, 0, 0.2, 1]
};

export const STATUS_CONFIG = {
    new: { label: "New", className: "bg-blue-50 text-blue-700 border-blue-200" },
    contacted: { label: "Contacted", className: "bg-amber-50 text-amber-800 border-amber-200" },
    converted: { label: "Converted", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-200" }
};
