"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { AcademicSessionProvider } from "@/contexts/AcademicSessionContext";

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <AcademicSessionProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        {children}
                    </ConfirmProvider>
                </ToastProvider>
            </AcademicSessionProvider>
        </SessionProvider>
    );
}
