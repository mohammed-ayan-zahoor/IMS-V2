"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Clock, 
    Save, 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    TrendingUp, 
    TrendingDown, 
    ArrowRightLeft, 
    ShieldCheck, 
    Info,
    Coins,
    Timer,
    CalendarClock
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

export default function HRSettingsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load HR settings");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchSettings(controller.signal);
        return () => controller.abort();
    }, [fetchSettings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/v1/hr/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update settings");

            toast.success("HR settings updated successfully");
        } catch (error) {
            toast.error(error.message || "Failed to update HR settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarClock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        HR & Timing Settings
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure shift schedules, late grace periods, mid-day permission deductions, and overtime rules.
                    </p>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Shift Schedule */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Daily Shift Timings</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Default working hours for staff & faculty check-in / check-out</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Shift Start Time (In-Time)
                            </label>
                            <Input
                                type="time"
                                value={formData.shiftStart}
                                onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard morning duty start time (e.g. 09:00 AM)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Shift End Time (Out-Time)
                            </label>
                            <Input
                                type="time"
                                value={formData.shiftEnd}
                                onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard evening duty end time (e.g. 06:00 PM)</p>
                        </div>
                    </div>
                </Card>

                {/* 2. Check-In & Check-Out Grace Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Morning Check-In */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                                <Timer className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Morning Check-In Rules</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Grace period & late arrival penalties</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Check-In Grace Period (Minutes)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={formData.checkInGraceMins}
                                    onChange={(e) => setFormData({ ...formData, checkInGraceMins: parseInt(e.target.value) || 0 })}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Permissible delay past shift start (e.g. 15 mins) without salary deduction.
                                </p>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">Block-Hour Deduction:</span> Arrivals exceeding the {formData.checkInGraceMins}-min grace period incur penalties rounded up to the next full hour block (e.g. 20 min late = 1 hr cut; 1 hr 5 min late = 2 hrs cut).
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Evening Check-Out */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="p-2 bg-rose-50 dark:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shift Exit (Check-Out) Rules</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Early departure grace & penalty window</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Early Departure Grace Period (Minutes)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={formData.checkOutGraceMins}
                                    onChange={(e) => setFormData({ ...formData, checkOutGraceMins: parseInt(e.target.value) || 0 })}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Permissible early exit window prior to shift end (e.g. 10 mins).
                                </p>
                            </div>

                            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">Early Exit Deduction:</span> Leaving earlier than {formData.checkOutGraceMins} mins before shift end triggers a 1-hour block penalty.
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 3. Deduction Rate & Mid-Day Out-Pass */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="p-2 bg-red-50 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Hourly Deduction Rate & Mid-Day Permissions</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unified hourly penalty rate and out-pass settings</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Hourly Deduction Rate (₹ per Hour Block)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500 font-medium">₹</span>
                                <Input
                                    type="number"
                                    min="0"
                                    className="pl-8"
                                    value={formData.deductionRatePerHour}
                                    onChange={(e) => setFormData({ ...formData, deductionRatePerHour: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Applied per full-hour block for late arrival, early exit, and personal mid-day absence.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                                        Personal Mid-Day Out-Pass Salary Deduction
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Automatically deduct pay in 1-hour blocks when staff leaves during duty hours for personal work.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.midDayOutEnabled}
                                    onClick={() => setFormData({ ...formData, midDayOutEnabled: !formData.midDayOutEnabled })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        formData.midDayOutEnabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            formData.midDayOutEnabled ? "translate-x-5" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            {formData.midDayOutEnabled && (
                                <div className="mt-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold">How Out-Pass Deductions Work:</span> Any personal exit up to 60 mins deducts 1 hour (₹{formData.deductionRatePerHour}). Leaving for 1 hr 15 mins spans into the 2nd hour block, deducting 2 hours (₹{formData.deductionRatePerHour * 2}).
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* 4. Overtime & Post-Shift Stay Rules */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Overtime (OT) & Extended Duty Rules</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Post-shift stay tracking and hourly overtime pay added to earnings</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-gray-900 dark:text-white">
                                    Enable Overtime Earnings Tracking
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Calculate extra salary for staff staying past the unpaid buffer period.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.overtimeEnabled}
                                onClick={() => setFormData({ ...formData, overtimeEnabled: !formData.overtimeEnabled })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    formData.overtimeEnabled ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"
                                )}
                            >
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        formData.overtimeEnabled ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>

                        {formData.overtimeEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Unpaid Buffer Period (Minutes)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={formData.overtimeBufferMins}
                                        onChange={(e) => setFormData({ ...formData, overtimeBufferMins: parseInt(e.target.value) || 0 })}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Initial duration after shift end that is not counted (e.g. 30 mins buffer).
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Overtime Rate (₹ per Hour)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 font-medium">₹</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="pl-8"
                                            value={formData.overtimeRatePerHour}
                                            onChange={(e) => setFormData({ ...formData, overtimeRatePerHour: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Extra pay credited per full hour of duty beyond the buffer.
                                    </p>
                                </div>

                                <div className="sm:col-span-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold">Overtime Calculation Flow:</span> For a {formData.shiftEnd} shift end with a {formData.overtimeBufferMins}-minute buffer, overtime starts counting from {formData.overtimeBufferMins} minutes past shift end. Only full completed hours are credited into the monthly payslip earnings.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Bottom Action Bar */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-base shadow-sm"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
