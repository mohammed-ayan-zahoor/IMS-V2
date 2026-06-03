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
    const [switchingId, setSwitchingId] = useState(null);

    const activeInstitute = session?.user?.institute;
    const availableInstitutes = session?.user?.availableInstitutes || [];
    const isSuperAdmin = session?.user?.role === 'super_admin';

    const handleSwitch = async (institute) => {
        if (institute.id === activeInstitute?.id) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        setSwitchingId(institute.id);
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

            await update({ activeInstitute: newActiveInstitute, activeRole });

            toast.success(`Switched to ${newActiveInstitute.name}`);
            setIsOpen(false);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSwitching(false);
            setSwitchingId(null);
        }
    };

    if (!activeInstitute && !isSuperAdmin) return null;

    const getInitials = (name) => name?.slice(0, 2).toUpperCase() || 'I';

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all duration-200 text-left group",
                    isOpen
                        ? "bg-white border-slate-200 shadow-sm"
                        : "border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"
                )}
            >
                {/* Logo / Initials */}
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 overflow-hidden">
                    {isSwitching ? (
                        <Loader2 size={15} className="animate-spin text-white" />
                    ) : activeInstitute?.logo ? (
                        <img src={activeInstitute.logo} alt="" className="w-full h-full object-contain p-1.5" />
                    ) : (
                        <span className="text-white text-[11px] font-bold tracking-tight">
                            {getInitials(activeInstitute?.name)}
                        </span>
                    )}
                </div>

                {/* Name + code */}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                        {activeInstitute?.name || 'Select Institute'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        {isSuperAdmin
                            ? <Globe size={9} className="text-blue-400" />
                            : <Building2 size={9} />
                        }
                        {activeInstitute?.code || 'GLOBAL'}
                    </p>
                </div>

                <ChevronDown
                    size={13}
                    className={cn(
                        "text-slate-300 transition-transform duration-200 shrink-0",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">

                        {/* Header */}
                        <div className="px-3.5 pt-3 pb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Institutes
                            </span>
                        </div>

                        {/* List */}
                        <div className="max-h-[260px] overflow-y-auto px-1.5 pb-1.5">
                            {availableInstitutes.length > 0 ? (
                                availableInstitutes.map((inst) => {
                                    const isActive = inst.id === activeInstitute?.id;
                                    const isLoading = switchingId === inst.id;
                                    return (
                                        <button
                                            key={inst.id}
                                            onClick={() => handleSwitch(inst)}
                                            disabled={isSwitching}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                                isActive
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "hover:bg-slate-50 text-slate-700",
                                                isSwitching && !isLoading && "opacity-50"
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden",
                                                isActive
                                                    ? "bg-blue-100 text-blue-600"
                                                    : "bg-slate-100 text-slate-500"
                                            )}>
                                                {inst.logo
                                                    ? <img src={inst.logo} alt="" className="w-full h-full object-contain p-1" />
                                                    : getInitials(inst.name)
                                                }
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-semibold truncate leading-tight">
                                                    {inst.name}
                                                </p>
                                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400 mt-0.5">
                                                    {inst.code}
                                                </p>
                                            </div>

                                            {/* State indicator */}
                                            {isLoading ? (
                                                <Loader2 size={13} className="text-blue-500 animate-spin shrink-0" />
                                            ) : isActive ? (
                                                <div className="shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <Check size={9} className="text-white stroke-[3]" />
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="py-8 text-center text-slate-400">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <Building2 size={18} className="opacity-40" />
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500">No institutes assigned</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Contact your administrator</p>
                                </div>
                            )}
                        </div>

                        {/* Super admin footer */}
                        {isSuperAdmin && (
                            <div className="px-2 pb-2 pt-1 border-t border-slate-100 mt-1">
                                <Link
                                    href="/super-admin/institutes"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 transition-colors text-white text-[10px] font-bold uppercase tracking-widest"
                                >
                                    <Globe size={10} />
                                    Manage All Institutes
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}