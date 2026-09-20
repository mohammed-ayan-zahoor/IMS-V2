"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

function subscribe(callback) {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
    return false;
}

/**
 * Returns true if the user prefers reduced motion, either via OS setting
 * or via Framer Motion configuration context.
 */
export function useReducedMotion() {
    const framerSetting = useFramerReducedMotion();
    const mediaMatches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    return Boolean(framerSetting || mediaMatches);
}

export default useReducedMotion;
