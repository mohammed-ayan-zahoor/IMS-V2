"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Search, PlusCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
    const containerRef = useRef(null);

    const isGrouped = options.length > 0 && options[0].group;

    const allOptions = isGrouped 
        ? options.flatMap(g => g.items)
        : options;

    const filteredOptions = allOptions.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOptions = allOptions.filter(opt => value.includes(opt.value));

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
            {label && (
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={cn(
                        "min-h-[44px] w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none transition-all duration-200 text-left flex flex-wrap gap-2 cursor-pointer",
                        "focus-within:border-premium-blue/50 focus-within:ring-4 focus-within:ring-premium-blue/10",
                        error && "border-red-500",
                        disabled && "opacity-50 cursor-not-allowed",
                        isOpen && "border-premium-blue/50 ring-4 ring-premium-blue/10 bg-white"
                    )}
                >
                    {selectedOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {selectedOptions.map((option) => (
                                <Badge 
                                    key={option.value} 
                                    variant="primary" 
                                    className="pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 group/badge animate-scale-in"
                                >
                                    {option.label}
                                    <button
                                        type="button"
                                        onClick={(e) => removeOption(e, option.value)}
                                        className="p-0.5 hover:bg-white/20 rounded-md transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-sm font-medium text-slate-400 py-1 pl-1">
                            {placeholder}
                        </span>
                    )}
                    <div className="flex items-center self-center px-1 border-l border-slate-200 ml-auto">
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5"
                        >
                            {/* Search Header */}
                            <div className="p-3 border-b border-slate-50 bg-slate-50/30 flex items-center gap-2">
                                <Search size={14} className="text-slate-400 shrink-0" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Search items..."
                                    className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-400"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()} // Prevent modal close
                                />
                                {search && (
                                    <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Actions */}
                            {showSelectAll && !search && allOptions.length > 0 && (
                                <div className="px-3 py-2 border-b border-slate-50 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-[10px] font-black uppercase tracking-widest text-premium-blue hover:text-premium-blue/80 transition-colors flex items-center gap-1.5"
                                    >
                                        {value.length === allOptions.length ? (
                                            <> <X size={12} /> Deselect All </>
                                        ) : (
                                            <> <PlusCircle size={12} /> Select All {allOptions.length} </>
                                        )}
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                                        {value.length} SELECTED
                                    </span>
                                </div>
                            )}

                            {/* Options List */}
                            <ul className="p-1 space-y-0.5 overflow-y-auto" style={{ maxHeight }}>
                                {isGrouped && !search ? (
                                    options.map((group) => (
                                        <div key={group.group} className="space-y-0.5">
                                            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 rounded-lg mx-1 mt-1">
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
                                            <li className="px-4 py-8 text-sm text-slate-400 text-center italic flex flex-col items-center gap-2">
                                                <X className="opacity-20" size={24} />
                                                No items found matching "{search}"
                                            </li>
                                        )}
                                    </>
                                )}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && <p className="text-[10px] text-red-500 ml-1 font-bold animate-shake">{error}</p>}
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
                    "w-full px-3 py-2.5 text-sm font-medium rounded-xl text-left flex items-center justify-between transition-all group",
                    isSelected
                        ? "bg-premium-blue/5 text-premium-blue"
                        : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-4 h-4 rounded border transition-all flex items-center justify-center",
                        isSelected
                            ? "bg-premium-blue border-premium-blue"
                            : "bg-white border-slate-300 group-hover:border-premium-blue/50"
                    )}>
                        {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                    </div>
                    <span>{option.label}</span>
                </div>
                {isSelected && (
                    <CheckCircle2 size={14} className="text-premium-blue animate-scale-in" />
                )}
            </button>
        </li>
    );
}
