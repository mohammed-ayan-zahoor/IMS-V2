"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthBrandingContext = createContext({
    institute: null,
    setInstitute: () => {},
    clearInstitute: () => {},
});

const STORAGE_KEY = "quantech_last_institute";

export function AuthBrandingProvider({ children }) {
    const [institute, setInstituteState] = useState(null);

    // Hydrate from localStorage on initial client load
    useEffect(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.name) {
                    setInstituteState(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load cached institute branding:", e);
        }
    }, []);

    const setInstitute = (inst) => {
        setInstituteState(inst);
        try {
            if (inst) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(inst));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.error("Failed to cache institute branding:", e);
        }
    };

    const clearInstitute = () => {
        setInstituteState(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
    };

    return (
        <AuthBrandingContext.Provider value={{ institute, setInstitute, clearInstitute }}>
            {children}
        </AuthBrandingContext.Provider>
    );
}

export function useAuthBranding() {
    return useContext(AuthBrandingContext);
}
