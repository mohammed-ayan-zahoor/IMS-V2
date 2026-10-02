"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    ShieldCheck, 
    UserCheck, 
    Save, 
    SlidersHorizontal, 
    AlertCircle, 
    Check, 
    RefreshCw, 
    Tag, 
    ArrowLeft,
    ShieldAlert
} from "lucide-react";
import Link from "next/link";

export default function MasterAdminSettingsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [savingMaster, setSavingMaster] = useState(false);
    const [savingRules, setSavingRules] = useState(false);

    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [selectedMasterId, setSelectedMasterId] = useState("");
    const [currentMaster, setCurrentMaster] = useState(null);

    const [rules, setRules] = useState({ discount: false });

    const [feedback, setFeedback] = useState(null);

    const isMasterAdmin = session?.user?.isMasterAdmin || session?.user?.role === 'super_admin';

    const loadData = async () => {
        try {
            setLoading(true);
            const [masterRes, rulesRes] = await Promise.all([
                fetch('/api/v1/admin/master'),
                fetch('/api/v1/institute/approval-rules')
            ]);

            if (masterRes.ok) {
                const masterData = await masterRes.json();
                setEligibleUsers(masterData.eligibleUsers || []);
                setCurrentMaster(masterData.masterAdmin);
                setSelectedMasterId(masterData.masterAdmin?.id || "");
            }

            if (rulesRes.ok) {
                const rulesData = await rulesRes.json();
                setRules(rulesData.rules || { discount: false });
            }
        } catch (err) {
            console.error("Failed to load master admin settings:", err);
            setFeedback({ type: "error", message: "Failed to load settings data" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    const handleSaveMaster = async () => {
        try {
            setSavingMaster(true);
            const res = await fetch('/api/v1/admin/master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedMasterId || null })
            });

            const data = await res.json();
            if (res.ok) {
                setFeedback({ type: "success", message: "Master Admin updated successfully!" });
                setTimeout(() => setFeedback(null), 4000);
                loadData();
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to update Master Admin" });
                setTimeout(() => setFeedback(null), 4000);
            }
        } catch (err) {
            setFeedback({ type: "error", message: "Network error occurred" });
        } finally {
            setSavingMaster(false);
        }
    };

    const handleSaveRules = async () => {
        try {
            setSavingRules(true);
            const res = await fetch('/api/v1/institute/approval-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules })
            });

            const data = await res.json();
            if (res.status === 202) {
                setFeedback({
                    type: "info",
                    message: data.message || "Rule changes sent to Master Admin for approval!"
                });
                setTimeout(() => setFeedback(null), 5000);
            } else if (res.ok) {
                setFeedback({ type: "success", message: "Approval rules saved successfully!" });
                setTimeout(() => setFeedback(null), 4000);
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to save approval rules" });
                setTimeout(() => setFeedback(null), 4000);
            }
        } catch (err) {
            setFeedback({ type: "error", message: "Network error occurred" });
        } finally {
            setSavingRules(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 dark:border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin/settings"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-blue-600" />
                            Master Admin & Approval Rules
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Designate a Master Admin for this institute and select actions that require their approval.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/approvals"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 transition"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        View Approvals Queue
                    </Link>
                </div>
            </div>

            {/* Feedback Banner */}
            {feedback && (
                <div className={`p-4 rounded-xl text-sm font-medium border transition-all ${
                    feedback.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200' 
                        : feedback.type === 'info'
                        ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200'
                }`}>
                    {feedback.message}
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-60" />
                    <p className="text-sm">Loading configurations...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Card 1: Master Admin Designation */}
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                    Designated Master Admin
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Choose an admin or staff member who has the authority to review and approve gated actions.
                                </p>
                            </div>
                            {currentMaster && (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                                    Current: {currentMaster.name}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Select Master Admin
                            </label>
                            <select
                                value={selectedMasterId}
                                onChange={(e) => setSelectedMasterId(e.target.value)}
                                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- No Master Admin (Approvals Disabled) --</option>
                                {eligibleUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.email}) - {u.role.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400">
                                If no Master Admin is selected, operations will proceed directly without requiring approval.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSaveMaster}
                                disabled={savingMaster}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {savingMaster ? "Saving..." : "Save Master Admin"}
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Approval Gated Actions */}
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                                Approval Gated Actions
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Toggle which actions must be submitted to the Master Admin for review before taking effect.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Rule: Discount */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-rose-500" />
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                            Student Fee Discounts
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                                        When enabled, applying a discount on a student fee will hold the change and create a pending approval request for the Master Admin. Regular fee collection is not gated.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!rules.discount}
                                        onChange={(e) => setRules({ ...rules, discount: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong>Safety Rule:</strong> Changing these approval settings requires Master Admin approval if one is already designated and you are not the Master Admin.
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSaveRules}
                                disabled={savingRules}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {savingRules ? "Saving Rules..." : "Save Approval Rules"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
