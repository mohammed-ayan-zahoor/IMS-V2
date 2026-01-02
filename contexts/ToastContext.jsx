"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Toast from "@/components/ui/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "info") => {
        const id = Math.random().toString(36).substring(2, 11);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        warning: (msg) => addToast(msg, "warning"),
        info: (msg) => addToast(msg, "info"),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <Toast
                        key={t.id}
                        id={t.id}
                        type={t.type}
                        message={t.message}
                        onDismiss={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
