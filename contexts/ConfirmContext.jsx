"use client";

import { createContext, useContext, useState, useRef, useCallback } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [config, setConfig] = useState({ isOpen: false, title: "", message: "", type: "danger", confirmText: "" });
    const resolver = useRef(null);

    const confirm = useCallback(({ title, message, type = "danger", confirmText = "" }) => {
        setConfig({ isOpen: true, title, message, type, confirmText });
        return new Promise((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (resolver.current) resolver.current(true);
        setConfig((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const handleCancel = useCallback(() => {
        if (resolver.current) resolver.current(false);
        setConfig((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmDialog
                isOpen={config.isOpen}
                title={config.title}
                message={config.message}
                type={config.type}
                confirmText={config.confirmText}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
};
