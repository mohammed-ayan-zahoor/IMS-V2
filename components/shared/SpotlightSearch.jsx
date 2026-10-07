"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    UserPlus,
    CreditCard,
    CalendarCheck,
    Contact,
    Megaphone,
    LayoutDashboard,
    GraduationCap,
    Briefcase,
    Receipt,
    FileText,
    Calendar,
    Bus,
    BookOpen,
    Settings,
    Sparkles,
    LogOut,
    Building,
    Building2,
    Layers,
    Layers3,
    Globe,
    FileSignature,
    Award,
    Database,
    ShieldCheck,
    ShieldAlert,
    UserCog,
    Boxes,
    MessageSquare,
    Scan
} from "lucide-react";
import { signOut } from "next-auth/react";

function getSpotlightIcon(iconName) {
    const props = { size: 16, strokeWidth: 1.75, className: "text-slate-600" };
    switch (iconName) {
        case "log-out": return <LogOut {...props} className="text-red-500" />;
        case "user-plus": return <UserPlus {...props} />;
        case "credit-card": return <CreditCard {...props} />;
        case "calendar-check": return <CalendarCheck {...props} />;
        case "id-card":
        case "contact": return <Contact {...props} />;
        case "megaphone": return <Megaphone {...props} />;
        case "layout-dashboard": return <LayoutDashboard {...props} />;
        case "graduation-cap": return <GraduationCap {...props} />;
        case "briefcase": return <Briefcase {...props} />;
        case "receipt": return <Receipt {...props} />;
        case "file-text": return <FileText {...props} />;
        case "file-signature": return <FileSignature {...props} />;
        case "calendar": return <Calendar {...props} />;
        case "bus": return <Bus {...props} />;
        case "book-open": return <BookOpen {...props} />;
        case "building":
        case "building-2": return <Building2 {...props} />;
        case "layers":
        case "layers-3": return <Layers3 {...props} />;
        case "globe": return <Globe {...props} />;
        case "award": return <Award {...props} />;
        case "database": return <Database {...props} />;
        case "boxes": return <Boxes {...props} />;
        case "message-square": return <MessageSquare {...props} />;
        case "shield-check": return <ShieldCheck {...props} />;
        case "shield-alert": return <ShieldAlert {...props} />;
        case "user-cog": return <UserCog {...props} />;
        case "scan": return <Scan {...props} />;
        case "settings": return <Settings {...props} />;
        default: return <Sparkles {...props} />;
    }
}

export default function SpotlightSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const inputRef = useRef(null);
    const abortRef = useRef(null);

    // Fetch results debounced
    const fetchResults = useCallback(async (q) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            const res = await fetch(`/api/v1/search/spotlight?q=${encodeURIComponent(q)}&limit=8`, {
                signal: controller.signal
            });
            if (res.ok) {
                const data = await res.json();
                const items = data.results || [];
                setResults(items);
                setSelectedIndex(0);
            } else {
                setResults([]);
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.error("Spotlight fetch error:", err);
                setResults([]);
            }
        } finally {
            if (abortRef.current === controller) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchResults(query);
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen, query, fetchResults]);

    // Commit a result item
    const commitItem = useCallback(async (item) => {
        if (!item) return;
        onClose();
        if (item.id === "act-sign-out") {
            try {
                await signOut({ redirect: false });
            } catch (err) {
                console.error("SignOut error:", err);
            } finally {
                window.location.href = "/login";
            }
            return;
        }
        if (item.url) {
            router.push(item.url);
        }
    }, [onClose, router]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }

            // Direct ⌘1 to ⌘8 / Ctrl+1 to Ctrl+8 commit
            if ((e.metaKey || e.ctrlKey) && /^[1-8]$/.test(e.key)) {
                e.preventDefault();
                const index = parseInt(e.key, 10) - 1;
                if (results[index]) {
                    commitItem(results[index]);
                }
                return;
            }

            if (results.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % results.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[selectedIndex]) {
                    commitItem(results[selectedIndex]);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedIndex, commitItem, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="spotlight-root fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh]">
                {/* Clean backdrop scrim — zero background blur */}
                <motion.div
                    className="spotlight-stage absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        background: "rgba(15, 23, 42, 0.25)"
                    }}
                    onClick={onClose}
                />

                {/* Crisp White Floating Sheet */}
                <motion.div
                    className="spotlight-sheet relative z-10 w-full overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Spotlight Search"
                    initial={{ opacity: 0, scale: 0.98, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -6 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                    style={{
                        width: "min(620px, calc(100vw - 32px))",
                        background: "#FFFFFF",
                        borderRadius: "12px",
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 16px 40px -10px rgba(0,0,0,0.16)",
                        color: "#1E293B",
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
                        transformOrigin: "top center"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Field (Light Tint #F4F5F7, 44px tall, 6px inset, no border, no shadow) */}
                    <div
                        style={{
                            margin: "6px",
                            height: "44px",
                            padding: "0 14px",
                            background: "#F4F5F7",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                        }}
                    >
                        <Search size={16} strokeWidth={2} className="text-slate-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            aria-expanded={results.length > 0}
                            aria-controls="spotlight-results"
                            aria-activedescendant={results[selectedIndex] ? `spotlight-opt-${selectedIndex}` : undefined}
                            placeholder="Jump to any page, student, staff, receipt, or / for pages..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                width: "100%",
                                height: "100%",
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                fontSize: "14.5px",
                                letterSpacing: "-0.01em",
                                color: "#0F172A",
                                fontFamily: "inherit"
                            }}
                        />
                    </div>

                    {/* Result List (Unboxed, max 8 rows with smooth scroll) */}
                    <motion.div
                        id="spotlight-results"
                        role="listbox"
                        style={{
                            padding: "0 6px 6px",
                            position: "relative",
                            maxHeight: "440px",
                            overflowY: "auto"
                        }}
                        layout
                        transition={{ type: "spring", bounce: 0, duration: 0.22 }}
                    >
                        {results.length > 0 ? (
                            results.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        id={`spotlight-opt-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-keyshortcuts={`Meta+${idx + 1}`}
                                        className="spotlight-row group cursor-pointer"
                                        onPointerDown={() => setSelectedIndex(idx)}
                                        onClick={() => commitItem(item)}
                                        style={{
                                            position: "relative",
                                            display: "grid",
                                            gridTemplateColumns: "32px 1fr auto",
                                            columnGap: "10px",
                                            alignItems: "center",
                                            height: "50px",
                                            padding: "0 14px 0 10px",
                                            borderRadius: "8px",
                                            userSelect: "none"
                                        }}
                                    >
                                        {/* Shared Glide Highlight: one shared background element */}
                                        {isSelected && (
                                            <motion.div
                                                layoutId="spotlight-active-highlight"
                                                className="absolute inset-0 pointer-events-none"
                                                style={{
                                                    background: "#F1F3F5",
                                                    borderRadius: "8px",
                                                    zIndex: 0
                                                }}
                                                transition={{ type: "spring", bounce: 0, duration: 0.18 }}
                                            />
                                        )}

                                        {/* Neutral 32px Circle Well with Professional Line Icon */}
                                        <div
                                            className="relative z-10"
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: "#FFFFFF",
                                                border: "1px solid #EBECEF",
                                                display: "grid",
                                                placeItems: "center"
                                            }}
                                        >
                                            {getSpotlightIcon(item.icon)}
                                        </div>

                                        {/* Two-tier Text zone: Title (13px/500) + Metadata (11px/400 tabular) */}
                                        <div className="relative z-10 overflow-hidden">
                                            <div
                                                className="truncate"
                                                style={{
                                                    fontSize: "13px",
                                                    lineHeight: "1.3",
                                                    fontWeight: 500,
                                                    color: "#0F172A"
                                                }}
                                            >
                                                {item.title}
                                            </div>
                                            <div
                                                className="truncate"
                                                style={{
                                                    fontSize: "11px",
                                                    lineHeight: "1.3",
                                                    fontWeight: 400,
                                                    color: "#64748B",
                                                    fontVariantNumeric: "tabular-nums",
                                                    marginTop: "2px"
                                                }}
                                            >
                                                {item.metadata}
                                            </div>
                                        </div>

                                        {/* Shortcut Hint: strictly sequential ⌘1..⌘8 */}
                                        <div
                                            className="relative z-10 flex items-center justify-center"
                                            style={{
                                                font: "500 11px -apple-system, BlinkMacSystemFont, sans-serif",
                                                color: isSelected ? "#334155" : "#94A3B8",
                                                fontVariantNumeric: "tabular-nums",
                                                padding: "0 6px",
                                                height: "18px",
                                                borderRadius: "4px",
                                                background: isSelected ? "#FFFFFF" : "transparent",
                                                border: isSelected ? "1px solid #E2E8F0" : "1px solid transparent",
                                                boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                                                transition: "all 120ms ease"
                                            }}
                                        >
                                            ⌘{idx + 1}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div
                                className="py-7 text-center"
                                style={{
                                    fontSize: "13px",
                                    color: "#94A3B8"
                                }}
                            >
                                {loading ? "Searching..." : "No matching results found"}
                            </div>
                        )}
                    </motion.div>

                    {/* Footer Bar (Height 32px, separated only by 1px top hairline, segments separated by 1px hairlines) */}
                    <div
                        style={{
                            display: "flex",
                            height: "32px",
                            borderTop: "1px solid #EBECEF",
                            fontSize: "11.5px",
                            color: "#64748B",
                            alignItems: "stretch"
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                paddingLeft: "12px"
                            }}
                        >
                            <Sparkles size={13} strokeWidth={1.5} className="text-slate-400" />
                            <span className="font-medium text-slate-500">Spotlight</span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 10px",
                                borderLeft: "1px solid #EBECEF",
                                cursor: "pointer"
                            }}
                            onClick={() => {
                                setQuery("/ ");
                                inputRef.current?.focus();
                            }}
                        >
                            <span>Pages</span>
                            <span className="font-mono text-[10px] text-slate-400">/</span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 10px",
                                borderLeft: "1px solid #EBECEF",
                                cursor: "pointer"
                            }}
                            onClick={() => {
                                setQuery("> ");
                                inputRef.current?.focus();
                            }}
                        >
                            <span>Actions</span>
                            <span className="font-mono text-[10px] text-slate-400">&gt;</span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 10px",
                                borderLeft: "1px solid #EBECEF",
                                cursor: "pointer"
                            }}
                            onClick={() => {
                                setQuery("@ ");
                                inputRef.current?.focus();
                            }}
                        >
                            <span>Staff</span>
                            <span className="font-mono text-[10px] text-slate-400">@</span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 10px",
                                borderLeft: "1px solid #EBECEF",
                                cursor: "pointer"
                            }}
                            onClick={() => {
                                setQuery("# ");
                                inputRef.current?.focus();
                            }}
                        >
                            <span>Receipts</span>
                            <span className="font-mono text-[10px] text-slate-400">#</span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "0 10px",
                                borderLeft: "1px solid #EBECEF"
                            }}
                        >
                            <span className="text-slate-400">Select</span>
                            <span className="font-mono text-[10px] text-slate-500 font-bold">↵</span>
                        </div>
                    </div>
                </motion.div>

                <style jsx global>{`
                    .spotlight-row:active {
                        transform: scale(0.985);
                        transition: transform 100ms ease-out;
                    }
                `}</style>
            </div>
        </AnimatePresence>
    );
}
