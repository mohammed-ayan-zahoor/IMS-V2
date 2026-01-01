"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
};

const styles = {
    success: "bg-white border-l-4 border-l-emerald-500",
    error: "bg-white border-l-4 border-l-red-500",
    warning: "bg-white border-l-4 border-l-amber-500",
    info: "bg-white border-l-4 border-l-blue-500",
};

export default function Toast({ id, type, message, onDismiss }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleDismiss();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss(id);
        }, 300); // Wait for exit animation
    };

    return (
        <div
            role="alert"
            className={`
        relative flex items-center gap-3 w-full max-w-sm p-4 rounded-lg shadow-lg border border-slate-100/50 pointer-events-auto
        transition-all duration-300 ease-in-out transform
        ${isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
        ${styles[type] || styles.info}
      `}
        >
            <div className="flex-shrink-0">{icons[type] || icons.info}</div>
            <div className="flex-1 text-sm font-medium text-slate-700">{message}</div>
            <button
                type="button"
                aria-label="Dismiss notification"
                onClick={handleDismiss}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X size={16} />
            </button>        </div>
    );
}
