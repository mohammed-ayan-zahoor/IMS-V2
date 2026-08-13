"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    if (!isOpen || !mounted) return null;

    const content = (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 animate-in fade-in duration-200 no-print">
            {/* Backdrop click area */}
            <div 
                className="fixed inset-0"
                onClick={onClose} 
            />

            {/* Bottom Sheet Drawer */}
            <div className={cn(
                "relative bg-white rounded-t-xl p-5 space-y-3 animate-in slide-in-from-bottom duration-200 shadow-xl overflow-y-auto w-full border-t border-slate-200 z-10",
                maxHeight,
                className
            )}>
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />

                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                    <div>
                        {title && <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="pt-1">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
