"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { AcademicSessionProvider } from "@/contexts/AcademicSessionContext";
import { WebsiteThemeProvider } from "@/contexts/WebsiteThemeContext";

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <AcademicSessionProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        <WebsiteThemeProvider>
                            {children}
                        </WebsiteThemeProvider>
                    </ConfirmProvider>
                </ToastProvider>
            </AcademicSessionProvider>
        </SessionProvider>
    );
}


