"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { MOTION_TOKENS } from "./motion-tokens";

const ToastContext = createContext({
    showToast: () => {}
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
        }
    }, []);

    const showToast = useCallback((message, type = "success") => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message, type }]);

        timersRef.current[id] = setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, [removeToast]);

    const pauseTimer = (id) => {
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
        }
    };

    const resumeTimer = (id) => {
        timersRef.current[id] = setTimeout(() => {
            removeToast(id);
        }, 2000);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {typeof document !== "undefined" && createPortal(
                <div
                    className="fixed bottom-4 right-4 z-[999999] flex flex-col gap-2 pointer-events-none mou-portal-layer"
                    role="region"
                    aria-label="Notifications"
                >
                    <AnimatePresence mode="sync">
                        {toasts.map((toast) => (
                            <motion.div
                                key={toast.id}
                                role="status"
                                aria-live="polite"
                                onMouseEnter={() => pauseTimer(toast.id)}
                                onMouseLeave={() => resumeTimer(toast.id)}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: MOTION_TOKENS.durBase,
                                        ease: MOTION_TOKENS.easeOut
                                    }
                                }}
                                exit={{
                                    opacity: 0,
                                    x: 8,
                                    transition: {
                                        duration: MOTION_TOKENS.durFast,
                                        ease: MOTION_TOKENS.easeIn
                                    }
                                }}
                                layout
                                className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 bg-[#171a2f] text-white rounded-[6px] shadow-lg text-xs max-w-sm"
                            >
                                {toast.type === "success" && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                                {toast.type === "error" && <AlertCircle size={14} className="text-rose-400 shrink-0" />}
                                {toast.type === "info" && <Info size={14} className="text-indigo-400 shrink-0" />}
                                <span className="flex-1 font-medium">{toast.message}</span>
                                <button
                                    type="button"
                                    onClick={() => removeToast(toast.id)}
                                    aria-label="Dismiss notification"
                                    className="text-slate-400 hover:text-white transition-colors p-0.5"
                                >
                                    <X size={13} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}
