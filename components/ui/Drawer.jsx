"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, useId } from "react";
import FocusTrap from "focus-trap-react";

export default function Drawer({ isOpen, onClose, title, children, className = "" }) {
    const [mounted, setMounted] = useState(false);
    const titleId = useId();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <FocusTrap
                        active={isOpen}
                        focusTrapOptions={{
                            initialFocus: false,
                            allowOutsideClick: true,
                            returnFocusOnDeactivate: true,
                            escapeDeactivates: false, // We handle ESC ourselves
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, x: "100%" }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            className={`bg-white w-full md:w-[70%] lg:w-[60%] h-full shadow-2xl overflow-hidden relative flex flex-col ${className}`}
                        >
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-white sticky top-0 z-10">
                                <h3 id={titleId} className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
                                <button
                                    onClick={onClose}
                                    aria-label="Close drawer"
                                    className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                                {children}
                            </div>
                        </motion.div>
                    </FocusTrap>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
