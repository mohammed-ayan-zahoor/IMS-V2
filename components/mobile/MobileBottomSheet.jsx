"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileBottomSheet({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    className,
    maxHeight = "max-h-[85vh]"
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click area */}
            <div 
                className="fixed inset-0"
                onClick={onClose} 
            />

            {/* Bottom Sheet Drawer */}
            <div className={cn(
                "relative bg-white rounded-t-[28px] p-6 space-y-4 animate-in slide-in-from-bottom duration-250 shadow-2xl overflow-y-auto w-full border-t border-slate-100",
                maxHeight,
                className
            )}>
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />

                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                    <div>
                        {title && <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="pt-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
