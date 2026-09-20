"use client";

import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useNumberTween(target, options = {}) {
    const { duration = 350, skipFirst = true } = options;
    const isReducedMotion = useReducedMotion();

    const [current, setCurrent] = useState(target);
    const startValRef = useRef(target);
    const isFirstMountRef = useRef(true);
    const rafIdRef = useRef(null);

    useEffect(() => {
        if (isReducedMotion) return;

        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
            if (skipFirst) {
                startValRef.current = target;
                return;
            }
        }

        const startVal = startValRef.current;
        const endVal = Number(target) || 0;
        if (startVal === endVal) return;

        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / duration));
            // ease-out-cubic: 1 - (1 - t) ** 3
            const eased = 1 - Math.pow(1 - progress, 3);
            const nextVal = Math.round(startVal + (endVal - startVal) * eased);

            setCurrent(nextVal);

            if (progress < 1) {
                rafIdRef.current = requestAnimationFrame(animate);
            } else {
                setCurrent(endVal);
                startValRef.current = endVal;
            }
        };

        rafIdRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [target, duration, isReducedMotion, skipFirst]);

    if (isReducedMotion) {
        return Math.round(target);
    }

    return Math.round(current);
}

export default useNumberTween;
