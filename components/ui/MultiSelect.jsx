"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Search, PlusCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import Badge from "./Badge";

export default function MultiSelect({
    options = [],
    value = [], // Array of values
    onChange,
    placeholder = "Select multiple...",
    label,
    error,
    disabled = false,
    className,
    maxHeight = "250px",
    showSelectAll = true,
    groupLabel = false // If true, assumes nested structure or we can add grouping logic
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const buttonRef = useRef(null);

    const isGrouped = options.length > 0 && options[0].group;

    const allOptions = isGrouped 
        ? options.flatMap(g => g.items)
        : options;

    const filteredOptions = allOptions.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOptions = allOptions.filter(opt => value.includes(opt.value));

    const listRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                if (listRef.current && listRef.current.contains(event.target)) return;
                setIsOpen(false);
            }
        };

        const handleScroll = (event) => {
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

    const toggleOption = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const removeOption = (e, optionValue) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== optionValue));
    };

    const handleSelectAll = () => {
        if (value.length === allOptions.length) {
            onChange([]);
        } else {
            onChange(allOptions.map(o => o.value));
        }
    };

    return (
        <div className={cn("w-full space-y-1", className)} ref={containerRef}>
            {label && (
                <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400/80 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    ref={buttonRef}
                    onClick={handleToggle}
                    className={cn(
                        "min-h-[38px] w-full bg-slate-50/50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none transition-all duration-200 text-left flex flex-wrap gap-1.5 cursor-pointer",
                        "focus-within:border-premium-blue/40 focus-within:ring-2 focus-within:ring-premium-blue/5",
                        error && "border-red-400",
                        disabled && "opacity-50 cursor-not-allowed",
                        isOpen && "border-premium-blue/40 ring-2 ring-premium-blue/5 bg-white shadow-sm"
                    )}
                >
                    {selectedOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 flex-1">
                            {selectedOptions.map((option) => (
                                <Badge 
                                    key={option.value} 
                                    variant="primary" 
                                    className="pl-2 pr-1 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 group/badge animate-scale-in border-none shadow-none"
                                >
                                    {option.label}
                                    <button
                                        type="button"
                                        onClick={(e) => removeOption(e, option.value)}
                                        className="p-0.5 hover:bg-white/20 rounded transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs font-medium text-slate-400 py-0.5 pl-1.5 translate-y-[1px]">
                            {placeholder}
                        </span>
                    )}
                    <div className="flex items-center self-stretch px-1 ml-auto opacity-40">
                        <ChevronDown size={12} className={cn("transition-transform duration-300", isOpen && "rotate-180")} />
                    </div>
                </div>

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
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white border border-slate-200/60 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/[0.02]"
                        >
                            {/* Search Header - Sleeker */}
                            <div className="px-2.5 py-2 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
                                <Search size={12} className="text-slate-400 shrink-0" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Quick search..."
                                    className="w-full bg-transparent border-none outline-none text-xs font-medium placeholder:text-slate-400"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                                {search && (
                                    <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Actions - Compact */}
                            {showSelectAll && !search && allOptions.length > 0 && (
                                <div className="px-3 py-1.5 border-b border-slate-50 flex items-center justify-between bg-white">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-[9px] font-black uppercase tracking-wider text-premium-blue/70 hover:text-premium-blue transition-colors flex items-center gap-1"
                                    >
                                        {value.length === allOptions.length ? "Deselect All" : "Select All"}
                                    </button>
                                    <span className="text-[9px] font-bold text-slate-300 tracking-tight">
                                        {value.length}/{allOptions.length}
                                    </span>
                                </div>
                            )}

                            {/* Options List - Tighter */}
                            <ul className="p-1 space-y-0.5 overflow-y-auto" style={{ maxHeight: "200px" }}>
                                {isGrouped && !search ? (
                                    options.map((group) => (
                                        <div key={group.group} className="first:mt-0 mt-2 mb-1">
                                            <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">
                                                {group.group}
                                            </div>
                                            {group.items.map((option) => (
                                                <OptionItem 
                                                    key={option.value} 
                                                    option={option} 
                                                    isSelected={value.includes(option.value)} 
                                                    onSelect={() => toggleOption(option.value)} 
                                                />
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                                            <OptionItem 
                                                key={option.value} 
                                                option={option} 
                                                isSelected={value.includes(option.value)} 
                                                onSelect={() => toggleOption(option.value)} 
                                            />
                                        )) : (
                                            <li className="px-4 py-6 text-xs text-slate-400 text-center italic flex flex-col items-center gap-1.5">
                                                No results
                                            </li>
                                        )}
                                    </>
                                )}
                            </ul>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </div>
            {error && <p className="text-[9px] text-red-500 ml-1 font-bold animate-shake">{error}</p>}
        </div>
    );
}

function OptionItem({ option, isSelected, onSelect }) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left flex items-center justify-between transition-all group",
                    isSelected
                        ? "bg-premium-blue text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100/60"
                )}
            >
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0",
                        isSelected
                            ? "bg-white/20 border-white/40"
                            : "bg-white border-slate-200 group-hover:border-premium-blue/30"
                    )}>
                        {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                    </div>
                    <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                    <CheckCircle2 size={12} className="text-white/80 animate-scale-in" />
                )}
            </button>
        </li>
    );
}
