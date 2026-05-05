"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const AcademicSessionContext = createContext();

export function AcademicSessionProvider({ children }) {
    const { data: session, status } = useSession();
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [loading, setLoading] = useState(true);

    const instituteId = session?.user?.institute?._id || session?.user?.institute;

    const fetchSessions = async (signal) => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/sessions", { signal });
            if (res.ok) {
                const data = await res.json();
                const allSessions = data.sessions || [];
                setSessions(allSessions);
                
                // Priority for selection:
                // 1. Saved in localStorage (Manual preference)
                // 2. User's assigned activeSession (Profile preference)
                // 3. Global active session from DB (Institute default)
                // 4. First session found
                const saved = localStorage.getItem('selectedSession');
                const userActive = session?.user?.activeSession;
                const globalActive = allSessions.find(s => s.isActive);
                
                if (saved && allSessions.some(s => s._id === saved)) {
                    setSelectedSessionId(saved);
                } else if (userActive && allSessions.some(s => String(s._id) === String(userActive))) {
                    setSelectedSessionId(userActive);
                } else if (globalActive) {
                    setSelectedSessionId(globalActive._id);
                    localStorage.setItem('selectedSession', globalActive._id);
                } else if (allSessions.length > 0) {
                    setSelectedSessionId(allSessions[0]._id);
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error fetching academic sessions:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch sessions whenever auth status becomes 'authenticated'
    // This fires reliably on every page load/reload since status transitions
    // from 'loading' -> 'authenticated', and also clears data on logout.
    useEffect(() => {
        const controller = new AbortController();

        if (status === 'authenticated' && instituteId) {
            fetchSessions(controller.signal);
        } else if (status === 'unauthenticated') {
            setSelectedSessionId(null);
            setSessions([]);
            localStorage.removeItem('selectedSession');
            sessionStorage.removeItem('selectedSession');
        }

        return () => controller.abort();
    }, [status, instituteId]);

    const changeSession = (id) => {
        setSelectedSessionId(id);
        localStorage.setItem('selectedSession', id);
        // Also store in sessionStorage as an additional safety mechanism
        // sessionStorage clears on browser close
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('selectedSession', id);
        }
    };

    const selectedSession = sessions.find(s => s._id === selectedSessionId);

    return (
        <AcademicSessionContext.Provider value={{ 
            sessions, 
            selectedSessionId, 
            selectedSession,
            changeSession, 
            loading,
            refreshSessions: fetchSessions
        }}>
            {children}
        </AcademicSessionContext.Provider>
    );
}

export const useAcademicSession = () => {
    const context = useContext(AcademicSessionContext);
    if (!context) {
        throw new Error("useAcademicSession must be used within an AcademicSessionProvider");
    }
    return context;
};
