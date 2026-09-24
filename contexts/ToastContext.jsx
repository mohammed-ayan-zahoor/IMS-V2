"use client";

import { createContext, useContext, useMemo } from "react";
import { GooeyToaster, gooeyToast } from "goey-toast";
import "goey-toast/styles.css";

const ToastContext = createContext(null);

export const toast = gooeyToast;

export function ToastProvider({ children }) {
    return (
        <ToastContext.Provider value={gooeyToast}>
            {children}
            <GooeyToaster position="bottom-right" closeButton />
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    return context || gooeyToast;
};
