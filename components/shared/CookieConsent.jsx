"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Prevent showing on server-side render, run check on client mount
        const consent = sessionStorage.getItem('cookie-consent');
        if (!consent) {
            // Delay slightly to prevent render race conditions
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        sessionStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div 
            className="fixed bottom-6 right-6 max-w-sm w-[calc(100vw-3rem)] bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-4 shadow-xl z-50 transition-all duration-300 transform translate-y-0"
            style={{
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
        >
            <style jsx global>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
            
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700/50">
                    <ShieldCheck size={16} />
                </div>
                <div className="flex-1">
                    <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Cookie Disclosure</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                        We use essential session cookies to keep you securely logged in. No marketing or tracking cookies are used. Read our{' '}
                        <a href="/cookie-policy" className="text-blue-400 hover:underline font-semibold">
                            Cookie Policy
                        </a>
                        .
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleAccept}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                        >
                            Accept
                        </button>
                    </div>
                </div>
                <button 
                    onClick={() => setIsVisible(false)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
