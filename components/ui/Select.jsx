"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X as CloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

export default function Select({
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    label,
    error,
    disabled = false,
    className,
    buttonClassName,
    name,
    searchable = true
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                // Also check if click is inside the portal-ed list
                if (listRef.current && listRef.current.contains(event.target)) return;
                setIsOpen(false);
            }
        };

        const handleScroll = (event) => {
            // Only close if scrolling outside the dropdown list
            if (listRef.current && listRef.current.contains(event.target)) return;
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", handleScroll, true);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) setSearch("");
    }, [isOpen]);

    const handleToggle = () => {
        if (disabled) return;
        
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue) => {
        setIsOpen(false);
        if (!onChange) return;
        
        if (typeof onChange === 'function') {
            onChange(optionValue);
        }
    };

    return (
        <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
            {label && (
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleToggle}
                    className={cn(
                        "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none transition-all duration-200 text-left flex items-center justify-between gap-2",
                        "focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10",
                        error && "border-red-500",
                        disabled && "opacity-50 cursor-not-allowed",
                        !selectedOption && "text-slate-400",
                        buttonClassName
                    )}
                >
                    <span className="truncate block text-sm font-medium text-slate-700">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && typeof document !== "undefined" && createPortal(
                    <div 
                        ref={listRef}
                        className="fixed z-[10000]"
                        style={{
                            top: coords.top + 8,
                            left: coords.left,
                            width: coords.width
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5"
                        >
                            {searchable && (
                                <div className="px-3 py-2 border-b border-slate-50 bg-slate-50/30 flex items-center gap-2">
                                    <Search size={14} className="text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-400"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {search && (
                                        <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                                            <CloseIcon size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                            <ul className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                                {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            className={cn(
                                                "w-full px-3 py-2 text-sm font-medium rounded-lg text-left flex items-center justify-between transition-colors",
                                                option.value === value
                                                    ? "bg-premium-blue/5 text-premium-blue"
                                                    : "text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {option.label}
                                            {option.value === value && <Check size={14} />}
                                        </button>
                                    </li>
                                )) : (
                                    <li className="px-3 py-4 text-sm text-slate-400 text-center italic">
                                        No results found
                                    </li>
                                )}
                            </ul>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </div>
            {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
}

