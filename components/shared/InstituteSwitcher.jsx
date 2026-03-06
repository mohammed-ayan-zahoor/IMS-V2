"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChevronDown, Building2, Check, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

export default function InstituteSwitcher() {
    const { data: session, update } = useSession();
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    const activeInstitute = session?.user?.institute;
    const availableInstitutes = session?.user?.availableInstitutes || [];
    const isSuperAdmin = session?.user?.role === 'super_admin';

    // If super admin and no available institutes are populated (due to being global), 
    // we show a different state or allow search. 
    // But per our logic, super admins get at least one.

    const handleSwitch = async (institute) => {
        if (institute.id === activeInstitute?.id) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        try {
            const res = await fetch('/api/v1/auth/switch-institute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instituteId: institute.id })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to switch institute');
            }

            const { activeInstitute: newActiveInstitute, activeRole } = await res.json();

            // Refetch session / Update JWT
            await update({
                activeInstitute: newActiveInstitute,
                activeRole: activeRole
            });

            toast.success(`Switched to ${newActiveInstitute.name}`);
            setIsOpen(false);

            // Optionally reload to clear state, but update() should handle most things
            // window.location.reload(); 
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSwitching(false);
        }
    };

    if (!activeInstitute && !isSuperAdmin) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
                className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 text-left",
                    isOpen ? "bg-slate-50 border-premium-blue/30 shadow-sm" : "border-transparent hover:bg-slate-50"
                )}
            >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-premium-blue/10 flex items-center justify-center border border-premium-blue/20 text-premium-blue font-black text-xs">
                    {isSwitching ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : activeInstitute?.logo ? (
                        <img src={activeInstitute.logo} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                        activeInstitute?.name?.slice(0, 2).toUpperCase() || "I"
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="text-xs font-black tracking-tight text-slate-800 truncate">
                        {activeInstitute?.name || "Select Institute"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        {isSuperAdmin ? <Globe size={10} className="text-blue-500" /> : <Building2 size={10} />}
                        {activeInstitute?.code || "GLOBAL"}
                    </p>
                </div>

                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Your Institutes
                            </span>
                        </div>

                        {availableInstitutes.map((inst) => (
                            <button
                                key={inst.id}
                                onClick={() => handleSwitch(inst)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left",
                                    inst.id === activeInstitute?.id && "bg-blue-50/50"
                                )}
                            >
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                                    {inst.name?.slice(0, 2)?.toUpperCase() || "I"}
                                </div>                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">{inst.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase">{inst.code}</p>
                                </div>
                                {inst.id === activeInstitute?.id && (
                                    <Check size={14} className="text-blue-600" />
                                )}
                            </button>
                        ))}

                        {availableInstitutes.length === 0 && (
                            <div className="px-4 py-6 text-center text-slate-400">
                                <Building2 size={24} className="mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-bold">No other institutes assigned</p>
                            </div>
                        )}

                        {isSuperAdmin && (
                            <Link
                                href="/super-admin/institutes"
                                className="block mt-2 mx-2 p-2 rounded-xl bg-slate-900 text-white text-center text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                Manage All
                            </Link>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
