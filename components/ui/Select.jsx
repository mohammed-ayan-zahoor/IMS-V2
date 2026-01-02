"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Select({
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    label,
    error,
    disabled = false,
    className,
    name
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

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

    const handleSelect = (optionValue) => {
        onChange({ target: { name: props.name, value: optionValue } }); // Mimic event for compatibility
        setIsOpen(false);
    };

    // We need to pass name to handleSelect to fully mimic event if needed, 
    // but usually parent handles onChange(value) or onChange(event).
    // Let's standardize: onChange will receive an event-like object: { target: { name, value } }
    // requiring 'name' prop.

    return (
        <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
            {label && (
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={cn(
                        "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none transition-all duration-200 text-left flex items-center justify-between",
                        "focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10",
                        error && "border-red-500",
                        disabled && "opacity-50 cursor-not-allowed",
                        !selectedOption && "text-slate-400"
                    )}
                >
                    <span className="truncate block text-sm font-medium text-slate-700">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                        >
                            <ul className="p-1 space-y-0.5">
                                {options.length > 0 ? options.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
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
                                    <li className="px-3 py-2 text-sm text-slate-400 text-center italic">
                                        No options available
                                    </li>
                                )}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
}

// Helper to wrap primitive <select> props if needed, but the above is cleaner to implement directly.
// Need to handle 'props' usage for 'name'.
function SelectWrapper(props) {
    return <Select {...props} />;
}
