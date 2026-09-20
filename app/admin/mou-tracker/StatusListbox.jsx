"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { STATUS_CONFIG, MOTION_TOKENS } from "./motion-tokens";

const emptySubscribe = () => () => {};

function subscribeTouch(callback) {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia("(hover: none) or (pointer: coarse)");
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
}

function getSnapshotTouch() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: none) or (pointer: coarse)").matches;
}

const STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "converted", label: "Converted" },
    { value: "rejected", label: "Rejected" }
];

export default function StatusListbox({
    value = "new",
    onChange,
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const isTouch = useSyncExternalStore(subscribeTouch, getSnapshotTouch, () => false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, flipUp: false });
    const [statusState, setStatusState] = useState("idle"); // 'idle' | 'saving' | 'success' | 'error'

    const triggerRef = useRef(null);
    const listboxRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const searchStringRef = useRef("");

    // Update coordinates & flip detection
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const listboxHeight = 160; // Estimated height of 4 options
        const flipUp = spaceBelow < listboxHeight && spaceAbove > spaceBelow;

        setCoords({
            top: flipUp ? rect.top - 6 : rect.bottom + 6,
            left: rect.left,
            width: Math.max(120, rect.width),
            flipUp
        });
    }, []);

    // Close on scroll or resize while open
    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const handleScrollOrResize = (e) => {
            // If scrolling inside listbox, don't close
            if (listboxRef.current && listboxRef.current.contains(e.target)) return;
            setIsOpen(false);
        };

        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                listboxRef.current && !listboxRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen]);

    const handleSelect = async (newValue) => {
        if (newValue === value) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        triggerRef.current?.focus();

        // Optimistic UI with statusState
        const timer = setTimeout(() => setStatusState("saving"), 150);

        try {
            await onChange(newValue);
            clearTimeout(timer);
            setStatusState("success");
            setTimeout(() => setStatusState("idle"), 800);
        } catch {
            clearTimeout(timer);
            setStatusState("error");
            setTimeout(() => setStatusState("idle"), 400);
        }
    };

    // Keyboard navigation (ARIA select-only combobox pattern)
    const handleKeyDown = (e) => {
        if (disabled) return;

        if (!isOpen) {
            if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                updatePosition();
                const curIdx = STATUS_OPTIONS.findIndex(o => o.value === value);
                setActiveIndex(curIdx >= 0 ? curIdx : 0);
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "Escape":
            case "Tab":
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % STATUS_OPTIONS.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + STATUS_OPTIONS.length) % STATUS_OPTIONS.length);
                break;
            case "Home":
                e.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                setActiveIndex(STATUS_OPTIONS.length - 1);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < STATUS_OPTIONS.length) {
                    handleSelect(STATUS_OPTIONS[activeIndex].value);
                }
                break;
            default:
                // Type-ahead support
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    clearTimeout(searchTimeoutRef.current);
                    searchStringRef.current += e.key.toLowerCase();
                    searchTimeoutRef.current = setTimeout(() => {
                        searchStringRef.current = "";
                    }, 500);

                    const matchIdx = STATUS_OPTIONS.findIndex(o =>
                        o.label.toLowerCase().startsWith(searchStringRef.current)
                    );
                    if (matchIdx >= 0) {
                        setActiveIndex(matchIdx);
                    }
                }
                break;
        }
    };

    const activeConfig = STATUS_CONFIG[value] || STATUS_CONFIG.new;

    // On touch devices (or before mount), render native <select> for optimal OS experience
    if (!mounted || isTouch) {
        return (
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={`text-[11px] font-semibold border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors duration-150 ${activeConfig.className}`}
            >
                {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    }

    const currentLabel = STATUS_OPTIONS.find(o => o.value === value)?.label || "New";

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls="mou-status-listbox"
                aria-label={`Status: ${currentLabel}`}
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    updatePosition();
                    const curIdx = STATUS_OPTIONS.findIndex(o => o.value === value);
                    setActiveIndex(curIdx >= 0 ? curIdx : 0);
                    setIsOpen(prev => !prev);
                }}
                onKeyDown={handleKeyDown}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2.5 py-1 outline-none cursor-pointer select-none transition-colors duration-180 ${activeConfig.className} ${
                    statusState === "error" ? "border-rose-600 ring-1 ring-rose-600" : ""
                }`}
            >
                <span>{currentLabel}</span>

                {statusState === "saving" ? (
                    <Loader2 size={11} className="animate-spin text-current" />
                ) : statusState === "success" ? (
                    <Check size={11} className="text-emerald-700" />
                ) : (
                    <ChevronDown
                        size={11}
                        className={`transition-transform duration-180 text-current ${isOpen ? "rotate-180" : ""}`}
                    />
                )}
            </button>

            {/* Portaled Popup to avoid table clipping */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={listboxRef}
                            id="mou-status-listbox"
                            role="listbox"
                            aria-activedescendant={`mou-status-opt-${activeIndex}`}
                            tabIndex={-1}
                            initial={{
                                opacity: 0,
                                scale: 0.97,
                                y: coords.flipUp ? 4 : -4
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                transition: {
                                    duration: 0.14,
                                    ease: MOTION_TOKENS.easeOut
                                }
                            }}
                            exit={{
                                opacity: 0,
                                transition: {
                                    duration: 0.09,
                                    ease: MOTION_TOKENS.easeIn
                                }
                            }}
                            style={{
                                position: "fixed",
                                top: coords.flipUp ? undefined : coords.top,
                                bottom: coords.flipUp ? window.innerHeight - coords.top : undefined,
                                left: coords.left,
                                width: coords.width,
                                zIndex: 99999,
                                transformOrigin: coords.flipUp ? "bottom left" : "top left"
                            }}
                            className="bg-white border border-[#e4e7ef] rounded-[6px] shadow-lg py-1 text-xs text-[#171a2f] focus:outline-none select-none mou-portal-layer"
                        >
                            {STATUS_OPTIONS.map((opt, idx) => {
                                const isSelected = opt.value === value;
                                const isActive = idx === activeIndex;
                                const optConfig = STATUS_CONFIG[opt.value];

                                return (
                                    <div
                                        key={opt.value}
                                        id={`mou-status-opt-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors duration-60 ${
                                            isActive ? "bg-[#f5f6fa]" : ""
                                        }`}
                                    >
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${optConfig.className}`}>
                                            {opt.label}
                                        </span>
                                        {isSelected && <Check size={12} className="text-[#4f46e5] ml-2" />}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
