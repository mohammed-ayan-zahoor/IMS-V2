"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Clock, 
    Loader2, 
    ShieldCheck, 
    Coins, 
    Timer, 
    Fingerprint, 
    Copy, 
    Check, 
    RefreshCw, 
    TrendingUp, 
    ArrowUpRight,
    CheckCircle
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Apple-Design Critically Damped Springs ────────────────────────────────────
const SPRING_FAST = { type: "spring", bounce: 0, duration: 0.22 };
const SPRING_ACCORDION = { type: "spring", bounce: 0, duration: 0.28 };

export default function HRSettingsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedServer, setCopiedServer] = useState(false);
    const [regeneratingKey, setRegeneratingKey] = useState(false);
    const [biometricApiKey, setBiometricApiKey] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [formData, setFormData] = useState({
        shiftStart: "09:00",
        shiftEnd: "18:00",
        checkInGraceMins: 15,
        checkOutGraceMins: 10,
        deductionRatePerHour: 100,
        midDayOutEnabled: true,
        overtimeEnabled: true,
        overtimeBufferMins: 30,
        overtimeRatePerHour: 150
    });

    const [componentsList, setComponentsList] = useState([]);

    const fetchComponents = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/hr/salary-components");
            if (res.ok) {
                const data = await res.json();
                setComponentsList(data.salaryComponents || []);
            }
        } catch (error) {
            console.error("Failed to load salary components:", error);
        }
    }, []);

    const fetchSettings = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/settings", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            if (data.settings) {
                setFormData({
                    shiftStart: data.settings.shiftStart || "09:00",
                    shiftEnd: data.settings.shiftEnd || "18:00",
                    checkInGraceMins: data.settings.checkInGraceMins ?? 15,
                    checkOutGraceMins: data.settings.checkOutGraceMins ?? 10,
                    deductionRatePerHour: data.settings.deductionRatePerHour ?? 100,
                    midDayOutEnabled: data.settings.midDayOutEnabled ?? true,
                    overtimeEnabled: data.settings.overtimeEnabled ?? true,
                    overtimeBufferMins: data.settings.overtimeBufferMins ?? 30,
                    overtimeRatePerHour: data.settings.overtimeRatePerHour ?? 150
                });
                setBiometricApiKey(data.settings.biometricApiKey || "");
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                toast.error("Failed to load HR settings");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleRegenerateBiometricKey = async () => {
        if (!window.confirm("Regenerating this API key will immediately disconnect any active biometric sync scripts until updated with the new key. Proceed?")) return;
        setRegeneratingKey(true);
        try {
            const res = await fetch("/api/v1/hr/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ regenerateBiometricApiKey: true })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to regenerate API key");
            setBiometricApiKey(data.settings?.biometricApiKey || "");
            toast.success("New Biometric API Key generated");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setRegeneratingKey(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchSettings(controller.signal);
        fetchComponents();
        return () => controller.abort();
    }, [fetchSettings, fetchComponents]);

    const handleToggleComponent = async (id, currentActive) => {
        const nextActive = !currentActive;
        setComponentsList(prev => prev.map(c => c._id === id ? { ...c, isActive: nextActive } : c));
        try {
            const res = await fetch(`/api/v1/hr/salary-components/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextActive })
            });
            if (!res.ok) throw new Error("Failed to update status");
            toast.success(`Component ${nextActive ? "activated" : "deactivated"}`);
        } catch (err) {
            setComponentsList(prev => prev.map(c => c._id === id ? { ...c, isActive: currentActive } : c));
            toast.error("Failed to update component status");
        }
    };

    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/v1/hr/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update settings");

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2400);
            toast.success("Settings saved successfully");
        } catch (error) {
            toast.error(error.message || "Failed to update HR settings");
        } finally {
            setSaving(false);
        }
    }, [formData, toast]);

    // Keyboard shortcut ⌘S / Ctrl+S to save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                handleSubmit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSubmit]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center text-[#5F6673] text-[13px] gap-2">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
                <span>Loading HR configuration…</span>
            </div>
        );
    }

    return (
        <div className="text-[#14161A] select-none min-h-[calc(100vh-64px)] pb-28 max-w-3xl mx-auto font-[-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif]">
            {/* ── Page Header (H1, Subtitle, Primary Save) ─────────────────────────── */}
            <div className="pt-2 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E6E8EC]/80 mb-6">
                <div>
                    <h1 className="text-[22px] font-semibold text-[#14161A] tracking-[-0.015em] leading-tight m-0">
                        HR settings
                    </h1>
                    <p className="text-[13px] text-[#5F6673] mt-1 font-normal">
                        Shift schedules, grace periods, deductions, overtime, and biometric sync.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="h-8 px-3.5 rounded-lg bg-[#14161A] text-white hover:bg-black active:scale-[0.98] transition-all text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-none shrink-0"
                >
                    {saving ? (
                        <>
                            <Loader2 size={13} className="animate-spin text-white" />
                            <span>Saving…</span>
                        </>
                    ) : saveSuccess ? (
                        <>
                            <Check size={14} className="text-emerald-400" />
                            <span>Saved ✓</span>
                        </>
                    ) : (
                        <span>Save settings</span>
                    )}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* ── 1. Daily Shift Timings ────────────────────────────────────────── */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                            <Clock size={15} className="text-[#5F6673]" />
                            <span>Daily shift timings</span>
                        </h2>
                        <p className="text-[12px] text-[#5F6673] mt-0.5">
                            Default institutional working hours for staff check-in and check-out.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Shift start time (In-time)
                            </label>
                            <input
                                type="time"
                                value={formData.shiftStart}
                                onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                                required
                                className="w-full h-8 px-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                            />
                            <p className="text-[11px] text-[#5F6673]">Standard morning arrival target (e.g. 09:00 AM)</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Shift end time (Out-time)
                            </label>
                            <input
                                type="time"
                                value={formData.shiftEnd}
                                onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                                required
                                className="w-full h-8 px-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                            />
                            <p className="text-[11px] text-[#5F6673]">Standard evening departure target (e.g. 06:00 PM)</p>
                        </div>
                    </div>
                </section>

                <div className="h-[1px] bg-[#E6E8EC]/80" />

                {/* ── 2. Check-In & Check-Out Grace Rules ───────────────────────────── */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                            <Timer size={15} className="text-[#5F6673]" />
                            <span>Arrival & departure grace rules</span>
                        </h2>
                        <p className="text-[12px] text-[#5F6673] mt-0.5">
                            Permissible buffers before attendance deductions trigger block penalties.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Morning check-in grace period (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={formData.checkInGraceMins}
                                onChange={(e) => setFormData({ ...formData, checkInGraceMins: parseInt(e.target.value) || 0 })}
                                required
                                className="w-full h-8 px-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                            />
                            <p className="text-[11px] text-[#5F6673]">
                                Delays exceeding {formData.checkInGraceMins} mins incur hourly penalties rounded up to the next full hour block.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Early departure grace period (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={formData.checkOutGraceMins}
                                onChange={(e) => setFormData({ ...formData, checkOutGraceMins: parseInt(e.target.value) || 0 })}
                                required
                                className="w-full h-8 px-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                            />
                            <p className="text-[11px] text-[#5F6673]">
                                Exits earlier than {formData.checkOutGraceMins} mins before shift end trigger a 1-hour block penalty.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="h-[1px] bg-[#E6E8EC]/80" />

                {/* ── 3. Hourly Deduction Rate & Mid-Day Out-Pass ────────────────────── */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                            <Coins size={15} className="text-[#5F6673]" />
                            <span>Hourly deductions & mid-day exits</span>
                        </h2>
                        <p className="text-[12px] text-[#5F6673] mt-0.5">
                            Penalty rate applied to late arrivals, early exits, and personal departure passes.
                        </p>
                    </div>

                    <div className="max-w-xs space-y-1">
                        <label className="text-[11px] font-medium text-[#5F6673]">
                            Hourly deduction rate (₹ per hour block)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5F6673] font-medium">₹</span>
                            <input
                                type="number"
                                min="0"
                                value={formData.deductionRatePerHour}
                                onChange={(e) => setFormData({ ...formData, deductionRatePerHour: parseFloat(e.target.value) || 0 })}
                                required
                                className="w-full h-8 pl-7 pr-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                            />
                        </div>
                    </div>

                    {/* Toggle: Personal Mid-Day Out-Pass */}
                    <div className="pt-2 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <span className="text-[13px] font-medium text-[#14161A] block">
                                Personal mid-day out-pass salary deduction
                            </span>
                            <p className="text-[12px] text-[#5F6673]">
                                Automatically deducts pay in 1-hour blocks (₹{formData.deductionRatePerHour}/hr) when staff leave for personal errands during duty hours.
                            </p>
                        </div>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={formData.midDayOutEnabled}
                            onClick={() => setFormData(prev => ({ ...prev, midDayOutEnabled: !prev.midDayOutEnabled }))}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                                formData.midDayOutEnabled ? "bg-[#14161A]" : "bg-[#D1D5DB]"
                            )}
                        >
                            <motion.span
                                layout
                                transition={SPRING_FAST}
                                className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
                                style={{ marginLeft: formData.midDayOutEnabled ? "16px" : "0px" }}
                            />
                        </button>
                    </div>
                </section>

                <div className="h-[1px] bg-[#E6E8EC]/80" />

                {/* ── 4. Overtime (OT) Rules ────────────────────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                                <TrendingUp size={15} className="text-[#5F6673]" />
                                <span>Overtime (OT) pay tracking</span>
                            </h2>
                            <p className="text-[12px] text-[#5F6673] mt-0.5">
                                Calculate extra salary for staff staying past the shift end buffer.
                            </p>
                        </div>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={formData.overtimeEnabled}
                            onClick={() => setFormData(prev => ({ ...prev, overtimeEnabled: !prev.overtimeEnabled }))}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                                formData.overtimeEnabled ? "bg-[#14161A]" : "bg-[#D1D5DB]"
                            )}
                        >
                            <motion.span
                                layout
                                transition={SPRING_FAST}
                                className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
                                style={{ marginLeft: formData.overtimeEnabled ? "16px" : "0px" }}
                            />
                        </button>
                    </div>

                    <AnimatePresence initial={false}>
                        {formData.overtimeEnabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={SPRING_ACCORDION}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-[#5F6673]">
                                            Unpaid buffer period (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="120"
                                            value={formData.overtimeBufferMins}
                                            onChange={(e) => setFormData({ ...formData, overtimeBufferMins: parseInt(e.target.value) || 0 })}
                                            required
                                            className="w-full h-8 px-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                                        />
                                        <p className="text-[11px] text-[#5F6673]">
                                            Initial stay duration after {formData.shiftEnd} that is not counted (e.g. 30 mins).
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-[#5F6673]">
                                            Overtime rate (₹ per hour)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5F6673] font-medium">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.overtimeRatePerHour}
                                                onChange={(e) => setFormData({ ...formData, overtimeRatePerHour: parseFloat(e.target.value) || 0 })}
                                                required
                                                className="w-full h-8 pl-7 pr-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all tabular-nums font-medium"
                                            />
                                        </div>
                                        <p className="text-[11px] text-[#5F6673]">
                                            Full completed hours beyond the buffer credit extra pay to monthly payslips.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                <div className="h-[1px] bg-[#E6E8EC]/80" />

                {/* ── 5. Salary Components & Statutory Deductions Switchboard ───────── */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                                <ShieldCheck size={15} className="text-[#5F6673]" />
                                <span>Salary components switchboard</span>
                            </h2>
                            <p className="text-[12px] text-[#5F6673] mt-0.5">
                                Instantly enable or disable statutory taxes (EPF, ESI, TDS) and institutional allowances.
                            </p>
                        </div>

                        <a
                            href="/admin/hr/salary-components"
                            className="text-[12px] font-medium text-[#5F6673] hover:text-[#14161A] flex items-center gap-1 transition-colors shrink-0"
                        >
                            <span>Full master config</span>
                            <ArrowUpRight size={13} />
                        </a>
                    </div>

                    {componentsList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                            {componentsList.map((comp) => {
                                const isActive = comp.isActive !== false;
                                return (
                                    <div
                                        key={comp._id}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                            isActive 
                                                ? "bg-white border-[#E6E8EC]" 
                                                : "bg-[#F2F3F5]/40 border-transparent opacity-60"
                                        )}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="text-[12px] font-medium text-[#14161A] truncate leading-tight">
                                                {comp.name}
                                            </div>
                                            <div className="text-[11px] text-[#5F6673] truncate leading-tight mt-0.5">
                                                <span>{comp.type}</span>
                                                <span className="mx-1 text-[#E6E8EC]">·</span>
                                                <span>{comp.calculationType === "percentage" ? `${comp.defaultValue || 0}%` : (comp.defaultValue > 0 ? `₹${comp.defaultValue}` : "Custom")}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isActive}
                                            onClick={() => handleToggleComponent(comp._id, isActive)}
                                            className={cn(
                                                "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                                                isActive ? "bg-[#14161A]" : "bg-[#D1D5DB]"
                                            )}
                                        >
                                            <motion.span
                                                layout
                                                transition={SPRING_FAST}
                                                className="pointer-events-none block h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
                                                style={{ marginLeft: isActive ? "12px" : "0px" }}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-[12px] text-[#5F6673]">
                            Loading salary components…
                        </div>
                    )}
                </section>

                <div className="h-[1px] bg-[#E6E8EC]/80" />

                {/* ── 6. Biometric Device Integration ──────────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#14161A] flex items-center gap-2">
                                <Fingerprint size={15} className="text-[#5F6673]" />
                                <span>Biometric hardware integration</span>
                            </h2>
                            <p className="text-[12px] text-[#5F6673] mt-0.5">
                                Connect physical biometric hardware (Secureye, eSSL, ZKTeco, Realtime) to auto-sync punches.
                            </p>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0E8A7D]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0E8A7D]" />
                            <span>Server webhook ready</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Server Address */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Cloud server address (Device menu)
                            </label>
                            <div className="flex gap-1.5">
                                <input
                                    readOnly
                                    value="imsportal.3ftech.in"
                                    className="w-full h-8 px-3 font-mono text-[12px] bg-[#F2F3F5] text-[#14161A] rounded-lg border border-transparent focus:outline-none select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText("imsportal.3ftech.in");
                                        setCopiedServer(true);
                                        setTimeout(() => setCopiedServer(false), 2000);
                                        toast.success("Server address copied");
                                    }}
                                    className="h-8 px-2.5 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[12px] font-medium text-[#14161A] flex items-center gap-1 shrink-0"
                                >
                                    {copiedServer ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#5F6673]" />}
                                    <span>{copiedServer ? "Copied" : "Copy"}</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-[#5F6673]">
                                Port: <span className="font-mono text-[#14161A]">443</span> · HTTPS: <span className="font-semibold text-[#14161A]">ON</span>
                            </p>
                        </div>

                        {/* API Key */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">
                                Institute biometric API key
                            </label>
                            <div className="flex gap-1.5">
                                <input
                                    readOnly
                                    value={biometricApiKey || "Loading…"}
                                    className="w-full h-8 px-3 font-mono text-[12px] bg-[#F2F3F5] text-[#14161A] rounded-lg border border-transparent focus:outline-none select-all"
                                />
                                <button
                                    type="button"
                                    disabled={!biometricApiKey}
                                    onClick={() => {
                                        if (!biometricApiKey) return;
                                        navigator.clipboard.writeText(biometricApiKey);
                                        setCopiedKey(true);
                                        setTimeout(() => setCopiedKey(false), 2000);
                                        toast.success("API Key copied to clipboard");
                                    }}
                                    className="h-8 px-2.5 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[12px] font-medium text-[#14161A] flex items-center gap-1 shrink-0"
                                >
                                    {copiedKey ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#5F6673]" />}
                                    <span>{copiedKey ? "Copied" : "Copy"}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={regeneratingKey}
                                    onClick={handleRegenerateBiometricKey}
                                    className="w-8 h-8 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] active:scale-[0.98] transition-all flex items-center justify-center text-[#5F6673] hover:text-[#14161A] shrink-0"
                                    title="Regenerate Key"
                                >
                                    <RefreshCw size={13} className={cn(regeneratingKey && "animate-spin")} />
                                </button>
                            </div>
                            <p className="text-[11px] text-[#5F6673]">
                                Used for the LAN bridge script or direct webhook validation.
                            </p>
                        </div>
                    </div>

                    {/* 3-Step Setup Instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 bg-[#F2F3F5]/60 rounded-lg text-[12px] text-[#5F6673]">
                            <span className="font-semibold text-[#14161A] block mb-1">1. Map Biometric ID</span>
                            In Staff Directory, set each staff member&apos;s Biometric Machine ID to match the number enrolled on the device.
                        </div>
                        <div className="p-3 bg-[#F2F3F5]/60 rounded-lg text-[12px] text-[#5F6673]">
                            <span className="font-semibold text-[#14161A] block mb-1">2. Configure Device Menu</span>
                            Device Menu → Comm → Cloud Server. Set server to <code className="font-mono text-[11px] text-[#14161A]">imsportal.3ftech.in</code>, Port <code className="font-mono text-[11px] text-[#14161A]">443</code>, HTTPS ON.
                        </div>
                        <div className="p-3 bg-[#F2F3F5]/60 rounded-lg text-[12px] text-[#5F6673]">
                            <span className="font-semibold text-[#14161A] block mb-1">3. Auto Sync &amp; Duty Checks</span>
                            1st punch = Check-in; 2nd punch = Check-out. Late arrivals, early exits, and overtime compute automatically.
                        </div>
                    </div>
                </section>

                {/* Bottom Submit Action */}
                <div className="flex justify-end pt-4 border-t border-[#E6E8EC]/80">
                    <button
                        type="submit"
                        disabled={saving}
                        className="h-8 px-4 rounded-lg bg-[#14161A] text-white hover:bg-black active:scale-[0.98] transition-all text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                <span>Saving…</span>
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={14} className="text-emerald-400" />
                                <span>Saved ✓</span>
                            </>
                        ) : (
                            <span>Save settings</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
