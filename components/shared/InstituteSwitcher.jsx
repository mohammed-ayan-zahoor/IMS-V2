"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Check, Loader2, Search, Globe, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/apple-motion";

export default function InstituteSwitcher({ isCollapsed = false }) {
    const { data: session, update } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchingId, setSwitchingId] = useState(null);
    const [availableInstitutes, setAvailableInstitutes] = useState([]);
    const [loadingInstitutes, setLoadingInstitutes] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [undoData, setUndoData] = useState(null);

    const searchInputRef = useRef(null);
    const undoTimerRef = useRef(null);

    const activeInstitute = session?.user?.institute;
    const isSuperAdmin = session?.user?.role === "super_admin";

    // Synchronize document.title with institute code
    useEffect(() => {
        if (activeInstitute?.code) {
            const currentTitle = document.title.split(" · ")[0] || "Quantech IMS";
            document.title = `${currentTitle} · ${activeInstitute.code}`;
        }
    }, [activeInstitute?.code, pathname]);

    // Fetch available institutes
    const fetchInstitutes = useCallback(async () => {
        setLoadingInstitutes(true);
        try {
            const res = await fetch("/api/v1/auth/my-institutes");
            if (res.ok) {
                const data = await res.json();
                setAvailableInstitutes(data.availableInstitutes || []);
            }
        } catch (error) {
            console.error("Error fetching institutes:", error);
        } finally {
            setLoadingInstitutes(false);
        }
    }, []);

    // Load available institutes on mount
    useEffect(() => {
        fetchInstitutes();
    }, [fetchInstitutes]);

    const handleOpenToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next && availableInstitutes.length === 0) {
            fetchInstitutes();
        }
    };

    // Filter institutes and partition into Current vs Other
    const { currentInst, otherInstitutes, flatList } = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const current = availableInstitutes.find((i) => (i.id || i._id) === (activeInstitute?.id || activeInstitute?._id)) || activeInstitute;
        
        let others = availableInstitutes.filter((i) => (i.id || i._id) !== (activeInstitute?.id || activeInstitute?._id));
        if (query) {
            others = others.filter(
                (i) =>
                    i.name?.toLowerCase().includes(query) ||
                    i.code?.toLowerCase().includes(query)
            );
        }

        const flat = [];
        if (current && (!query || current.name?.toLowerCase().includes(query) || current.code?.toLowerCase().includes(query))) {
            flat.push(current);
        }
        flat.push(...others);

        return { currentInst: current, otherInstitutes: others, flatList: flat };
    }, [availableInstitutes, activeInstitute, searchQuery]);

    // Keyboard navigation within listbox
    const handleListKeyDown = (e) => {
        if (!isOpen || flatList.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % flatList.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + flatList.length) % flatList.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const target = flatList[highlightedIndex];
            if (target) handleSwitch(target);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    // Switching with undo flow
    const handleSwitch = async (institute, isUndoAction = false) => {
        const targetId = institute?.id || institute?._id;
        const currentId = activeInstitute?.id || activeInstitute?._id;

        if (!targetId || targetId === currentId) {
            setIsOpen(false);
            return;
        }

        const prevInstitute = activeInstitute;
        setIsOpen(false);
        setIsSwitching(true);
        setSwitchingId(targetId);

        try {
            const res = await fetch("/api/v1/auth/switch-institute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instituteId: targetId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to switch institute");
            }

            const { activeInstitute: newActiveInstitute, activeRole } = await res.json();
            await update({ activeInstitute: newActiveInstitute, activeRole });

            if (newActiveInstitute?.code) {
                const baseTitle = document.title.split(" · ")[0] || "Quantech IMS";
                document.title = `${baseTitle} · ${newActiveInstitute.code}`;
            }

            if (!isUndoAction) {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoData({
                    prevInstitute,
                    newInstitute: newActiveInstitute,
                });
                undoTimerRef.current = setTimeout(() => {
                    setUndoData(null);
                }, 6000);
            } else {
                setUndoData(null);
            }

            router.refresh();
        } catch (error) {
            console.error("Failed to switch institute", error);
        } finally {
            setIsSwitching(false);
            setSwitchingId(null);
        }
    };

    const handleUndo = () => {
        if (!undoData?.prevInstitute) return;
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        const target = undoData.prevInstitute;
        setUndoData(null);
        handleSwitch(target, true);
    };

    if (!activeInstitute && !isSuperAdmin) return null;

    const getInitials = (name) => {
        if (!name) return "I";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleOpenToggle}
                disabled={isSwitching}
                title={activeInstitute?.name || "Switch Institute"}
                className={cn(
                    "w-full flex items-center rounded-xl border transition-all duration-150 text-left group cursor-pointer outline-none",
                    isCollapsed ? "justify-center p-1.5 w-11 h-11 mx-auto" : "gap-2.5 px-2.5 py-2",
                    isOpen
                        ? "bg-white border-slate-200 shadow-sm"
                        : "border-transparent hover:bg-white hover:border-slate-200/80 hover:shadow-xs"
                )}
            >
                {/* Logo Display */}
                {isSwitching ? (
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                    </div>
                ) : activeInstitute?.logo ? (
                    <img
                        src={activeInstitute.logo}
                        alt=""
                        className="w-10 h-10 object-contain shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-[13px] font-bold text-slate-800">
                        {getInitials(activeInstitute?.name)}
                    </div>
                )}

                {/* Institute Name & Code */}
                {!isCollapsed && (
                    <>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">
                                {activeInstitute?.name || "Select Institute"}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                                {activeInstitute?.code || "GLOBAL"}
                            </p>
                        </div>

                        <ChevronDown
                            size={14}
                            className={cn(
                                "text-slate-400 transition-transform duration-200 shrink-0",
                                isOpen && "rotate-180"
                            )}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Outside Click Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown Content */}
                        <motion.div
                            role="listbox"
                            tabIndex={-1}
                            onKeyDown={handleListKeyDown}
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                                "absolute z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/70 flex flex-col",
                                isCollapsed
                                    ? "left-full top-0 ml-2 w-72 max-h-[460px]"
                                    : "top-full left-0 right-0 mt-1.5 w-full max-h-[460px]"
                            )}
                        >
                            {/* Search Field */}
                            <div className="p-2 border-b border-slate-100 shrink-0">
                                <div className="relative flex items-center">
                                    <Search size={13} className="absolute left-2.5 text-slate-400" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setHighlightedIndex(0);
                                        }}
                                        placeholder="Search institutes..."
                                        className="w-full h-8 pl-8 pr-3 bg-slate-50 text-[12px] text-slate-900 placeholder-slate-400 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-blue-600 transition-shadow"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 focus:outline-none">
                                {loadingInstitutes && availableInstitutes.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-blue-600" />
                                        <p className="text-[11px] font-medium">Loading institutes...</p>
                                    </div>
                                ) : flatList.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-[12px]">
                                        No institutes match “{searchQuery}”
                                    </div>
                                ) : (
                                    <>
                                        {/* Pinned Current Institute */}
                                        {currentInst && (
                                            <div className="space-y-0.5 mb-1.5">
                                                <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Current
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsOpen(false)}
                                                    className="w-full flex items-center gap-3 p-2 rounded-xl text-left bg-blue-50/70 text-blue-700 cursor-pointer"
                                                >
                                                    {currentInst.logo ? (
                                                        <img
                                                            src={currentInst.logo}
                                                            alt=""
                                                            className="w-9 h-9 object-contain shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-[12px] font-bold text-blue-700">
                                                            {getInitials(currentInst.name)}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 pr-1">
                                                        <p className="text-[12px] font-semibold text-slate-900 truncate leading-tight">
                                                            {currentInst.name}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                            {currentInst.code}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-blue-600 pr-1">
                                                        <Check size={14} strokeWidth={2.5} />
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* Other Institutes */}
                                        {otherInstitutes.length > 0 && (
                                            <div className="space-y-0.5">
                                                <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Switch to
                                                </div>
                                                {otherInstitutes.map((inst) => {
                                                    const instId = inst.id || inst._id;
                                                    const isLoading = switchingId === instId;

                                                    return (
                                                        <button
                                                            key={instId}
                                                            type="button"
                                                            onClick={() => handleSwitch(inst)}
                                                            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                                                        >
                                                            {inst.logo ? (
                                                                <img
                                                                    src={inst.logo}
                                                                    alt=""
                                                                    className="w-9 h-9 object-contain shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-[12px] font-bold text-slate-700">
                                                                    {getInitials(inst.name)}
                                                                </div>
                                                            )}

                                                            <div className="flex-1 min-w-0 pr-1">
                                                                <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                                                    {inst.name}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                                    {inst.code}
                                                                </p>
                                                            </div>

                                                            {isLoading && (
                                                                <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Super Admin Manage Link */}
                            {isSuperAdmin && (
                                <div className="p-2 border-t border-slate-100 shrink-0">
                                    <Link
                                        href="/super-admin/institutes"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.98] transition-all text-slate-700 text-[11px] font-semibold"
                                    >
                                        <Globe size={12} className="text-slate-400" />
                                        <span>Manage all institutes</span>
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Reversible Switch Undo Toast */}
            <AnimatePresence>
                {undoData && (
                    <motion.div
                        role="status"
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={SPRING.ui}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#14161A] text-white shadow-2xl border border-white/10 text-[13px] font-medium"
                    >
                        <span>Switched to {undoData.newInstitute?.name}</span>
                        <button
                            type="button"
                            onClick={handleUndo}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 active:scale-95 transition-transform cursor-pointer"
                        >
                            <Undo2 size={13} />
                            <span>Undo</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}