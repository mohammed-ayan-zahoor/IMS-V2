"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Building2,
    Users,
    CreditCard,
    Plus,
    ArrowRight,
    Zap,
    Activity,
    Database,
    Globe,
    PhoneCall,
    CheckCircle,
    AlertCircle,
    Clock,
    Coins,
    Loader2
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SuperAdminDashboard() {
    const toast = useToast();
    const [stats, setStats] = useState({
        institutes: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        trendInstitutes: "...",
        trendUsers: "...",
        trendSubscriptions: "..."
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [voiceReports, setVoiceReports] = useState([]);
    const [recentCalls, setRecentCalls] = useState([]);
    const [voiceLoading, setVoiceLoading] = useState(true);

    // Modal states for voice quota management
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSaving, setModalSaving] = useState(false);
    const [modalForm, setModalForm] = useState({
        voiceCallsQuota: 5000,
        voiceCallsSent: 0,
        overdueVoiceReminderEnabled: false,
        dedicatedCallerId: "",
        voiceCallProvider: "mock"
    });

    const openManageModal = async (instId) => {
        const matchingReport = voiceReports.find(r => r.id === instId);
        setSelectedInstitute(matchingReport || { id: instId, name: "Institute Settings" });
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const res = await fetch(`/api/v1/institutes/${instId}`);
            if (res.ok) {
                const data = await res.json();
                const inst = data.institute;
                if (inst) {
                    setModalForm({
                        voiceCallsQuota: inst.usage?.voiceCallsQuota ?? 5000,
                        voiceCallsSent: inst.usage?.voiceCallsSent ?? 0,
                        overdueVoiceReminderEnabled: inst.notifications?.overdueVoiceReminderEnabled ?? false,
                        dedicatedCallerId: inst.notifications?.dedicatedCallerId ?? "",
                        voiceCallProvider: inst.notifications?.voiceCallProvider ?? "mock"
                    });
                }
            } else {
                toast.error("Failed to load detailed settings");
            }
        } catch (err) {
            console.error("Error fetching institute details:", err);
            toast.error("Error loading detailed settings");
        } finally {
            setModalLoading(false);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (!selectedInstitute) return;
        setModalSaving(true);
        try {
            const res = await fetch(`/api/v1/institutes/${selectedInstitute.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voiceCallsQuota: modalForm.voiceCallsQuota,
                    voiceCallsSent: modalForm.voiceCallsSent,
                    overdueVoiceReminderEnabled: modalForm.overdueVoiceReminderEnabled,
                    dedicatedCallerId: modalForm.dedicatedCallerId,
                    voiceCallProvider: modalForm.voiceCallProvider
                })
            });

            if (res.ok) {
                toast.success("Voice configurations updated successfully");
                
                // Update local list state so UI reflects the new limits and status immediately
                setVoiceReports(prev => prev.map(report => {
                    if (report.id === selectedInstitute.id) {
                        return {
                            ...report,
                            voiceCallsQuota: modalForm.voiceCallsQuota,
                            voiceCallsSent: modalForm.voiceCallsSent,
                            enabled: modalForm.overdueVoiceReminderEnabled,
                            estimatedCost: parseFloat((modalForm.voiceCallsSent * 0.70).toFixed(2))
                        };
                    }
                    return report;
                }));

                setIsModalOpen(false);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update voice configurations");
            }
        } catch (err) {
            console.error("Error saving voice settings:", err);
            toast.error("Error updating configurations");
        } finally {
            setModalSaving(false);
        }
    };

    useEffect(() => {
        const fetchVoiceReports = async () => {
            try {
                const res = await fetch("/api/admin/voice-billing-reports");
                if (res.ok) {
                    const data = await res.json();
                    setVoiceReports(data.reports || []);
                    setRecentCalls(data.recentCalls || []);
                }
            } catch (err) {
                console.error("Failed to load voice reports:", err);
            } finally {
                setVoiceLoading(false);
            }
        };
        fetchVoiceReports();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/admin/stats", { signal: controller.signal });
                if (!res.ok) throw new Error("Failed to load stats");
                const data = await res.json();
                setStats({
                    institutes: data.institutes || 0,
                    totalUsers: data.totalUsers || 0,
                    activeSubscriptions: data.activeSubscriptions || 0,
                    trendInstitutes: data.trendInstitutes || "+0% this month",
                    trendUsers: data.trendUsers || "+0 today",
                    trendSubscriptions: data.trendSubscriptions || "+0 new trials"
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Stats fetch error:", error);
                    setError("Failed to load dashboard stats.");
                    toast.error("Failed to load dashboard stats");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-red-50 border border-red-100 rounded-3xl flex flex-col items-center text-center gap-4"
            >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Zap size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">System Error</h3>
                    <p className="text-red-600/80 font-medium">{error}</p>
                </div>
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
                    Retry Connection
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-10">
            <header>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                    System Overview
                </h1>
                <p className="text-slate-500 font-medium">Monitoring the pulse of your education platform.</p>
            </header>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <StatCard
                    title="Total Institutes"
                    value={stats.institutes}
                    icon={Building2}
                    color="blue"
                    trend={stats.trendInstitutes}
                />
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="emerald"
                    trend={stats.trendUsers}
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon={CreditCard}
                    color="amber"
                    trend={stats.trendSubscriptions}
                />
            </motion.div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-3 bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Quick Actions</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ActionLink
                            href="/super-admin/institutes/create"
                            icon={Plus}
                            title="Register Institute"
                            description="Onboard a new organization to the platform."
                            primary
                        />
                        <ActionLink
                            href="/super-admin/institutes"
                            icon={ArrowRight}
                            title="Manage Directory"
                            description="Audit and manage all registered institutes."
                        />
                    </div>
                </motion.div>

                {/* System Status */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 bg-slate-900 p-8 rounded-[32px] text-white overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-black tracking-tight">System Node</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="font-bold text-emerald-400 text-sm">Cluster Active</span>
                                </div>
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">v2.4.0-STABLE</span>
                            </div>

                            <div className="space-y-4">
                                <StatusItem icon={Database} label="MongoDB Core" status="Optimized" />
                                <StatusItem icon={Globe} label="API Mesh" status="Healthy" />
                            </div>
                        </div>
                    </div>

                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px]" />
                </motion.div>
            </div>

            {/* Voice Reminders & Billing Dashboard */}
            <div className="space-y-8 mt-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
                        <PhoneCall size={20} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Voice Call Reminders & Billing</h3>
                        <p className="text-slate-500 text-sm font-medium">Monitor credits consumption, calling metrics, and transaction logs across all institutes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Schools Calling Consumption Table */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Institute Calling Metrics</h4>
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase tracking-wider">Exotel Shared Pool</span>
                        </div>

                        {voiceLoading ? (
                            <div className="flex-1 flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        ) : voiceReports.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                                <PhoneCall size={40} className="mb-3 opacity-30" />
                                <p className="text-sm font-bold">No active calls or institutes registered.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-wider">Institute</th>
                                            <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Status</th>
                                            <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Calls Sent / Quota</th>
                                            <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Est. Cost</th>
                                            <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {voiceReports.map(report => (
                                            <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 text-sm font-bold text-slate-800">{report.name}</td>
                                                <td className="py-4 text-center">
                                                    <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                                                        report.enabled 
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                            : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {report.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col items-center gap-1.5 max-w-[160px] mx-auto">
                                                        <div className="flex justify-between w-full text-[10px] font-bold text-slate-500">
                                                            <span>{report.voiceCallsSent} calls</span>
                                                            <span>/{report.voiceCallsQuota}</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                 className={`h-full rounded-full transition-all duration-500 ${
                                                                    (report.voiceCallsSent / report.voiceCallsQuota) > 0.9 
                                                                        ? 'bg-rose-500' 
                                                                        : (report.voiceCallsSent / report.voiceCallsQuota) > 0.7 
                                                                            ? 'bg-amber-500' 
                                                                            : 'bg-indigo-600'
                                                                }`}
                                                                style={{ width: `${Math.min(100, (report.voiceCallsSent / report.voiceCallsQuota) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm font-black text-slate-900 text-right">
                                                    ₹{report.estimatedCost.toLocaleString()}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => openManageModal(report.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent Call Logs */}
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col h-[420px]">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 shrink-0">
                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Recent Activity Log</h4>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-wider">Live System Calls</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                            {voiceLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                </div>
                            ) : recentCalls.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                                    <Clock size={32} className="mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No call history logged yet.</p>
                                </div>
                            ) : (
                                recentCalls.map(call => (
                                    <div key={call.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5 hover:border-slate-200 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <h5 className="text-xs font-black text-slate-800 truncate leading-snug">{call.studentName}</h5>
                                                <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{call.schoolName}</p>
                                            </div>
                                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                                                call.status === 'success' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                            }`}>
                                                {call.status}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                                            <span>Type: <strong className="capitalize text-slate-600">{call.feeType}</strong></span>
                                            <span>Cost: <strong className="text-slate-800">₹{call.cost}</strong></span>
                                        </div>

                                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-t border-slate-200/50 pt-2">
                                            <span>{call.phone}</span>
                                            <span>{new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>

                                        {call.status === 'failed' && call.error && (
                                            <div className="text-[9px] bg-rose-100/30 border border-rose-100 text-rose-600 p-2 rounded font-semibold break-words leading-tight">
                                                Err: {call.error}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Manage Voice Calling: ${selectedInstitute?.name || ''}`}
                className="max-w-xl"
            >
                {modalLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <span className="text-sm font-bold text-slate-500">Retrieving organization settings...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="space-y-4">
                            {/* Toggle Overdue Reminders */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Automated Reminders</h4>
                                    <p className="text-xs text-slate-400 font-medium">Trigger voice calls to parent/guardian on cross overdue day.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={modalForm.overdueVoiceReminderEnabled}
                                        onChange={(e) => setModalForm({...modalForm, overdueVoiceReminderEnabled: e.target.checked})}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Voice Call Provider */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Gateway Provider</label>
                                <select
                                    value={modalForm.voiceCallProvider}
                                    onChange={(e) => setModalForm({...modalForm, voiceCallProvider: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="mock">Console Mock (Development)</option>
                                    <option value="exotel">Exotel Platform Master</option>
                                    <option value="twilio">Twilio</option>
                                </select>
                            </div>

                            {/* Voice Calls Quota */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Calls Quota Limit</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={modalForm.voiceCallsQuota}
                                    onChange={(e) => setModalForm({...modalForm, voiceCallsQuota: Number(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all"
                                    required
                                />
                                <p className="text-[10px] text-slate-400 font-semibold">Maximum automated voice calls this school is allowed to consume.</p>
                            </div>

                            {/* Voice Calls Sent Counter (with reset) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Calls Sent Consumption</label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        value={modalForm.voiceCallsSent}
                                        onChange={(e) => setModalForm({...modalForm, voiceCallsSent: Number(e.target.value)})}
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setModalForm({...modalForm, voiceCallsSent: 0})}
                                        className="px-4 py-3 text-xs font-bold border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition-all cursor-pointer"
                                    >
                                        Reset to 0
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold">Currently tracked voice reminders dispatched. You can modify or reset this counter.</p>
                            </div>

                            {/* Dedicated Caller ID */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Dedicated Caller ID (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +91XXXXXXXXXX"
                                    value={modalForm.dedicatedCallerId}
                                    onChange={(e) => setModalForm({...modalForm, dedicatedCallerId: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all"
                                />
                                <p className="text-[10px] text-slate-400 font-semibold">Virtual phone number configured for outbound call routing (if different from default caller ID).</p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 text-sm font-bold border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={modalSaving}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {modalSaving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Settings</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, trend }) {
    const colorClasses = {
        blue: "bg-blue-600 shadow-blue-600/20",
        emerald: "bg-emerald-600 shadow-emerald-600/20",
        amber: "bg-amber-600 shadow-amber-600/20",
    };

    return (
        <motion.div
            variants={item}
            className="group bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl", colorClasses[color])}>
                    <Icon size={28} />
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Metrics
                </div>
            </div>

            <p className="text-slate-500 font-bold text-sm tracking-wide lowercase mb-1">{title}</p>
            <div className="flex items-baseline gap-3">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h2>
                <span className="text-xs font-bold text-emerald-500">{trend}</span>
            </div>
        </motion.div>
    );
}

function ActionLink({ href, icon: Icon, title, description, primary }) {
    return (
        <Link href={href} className={cn(
            "group p-6 rounded-2xl border transition-all duration-300",
            primary
                ? "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20"
                : "bg-white border-slate-200 hover:border-blue-600 hover:bg-slate-50"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                primary ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
            )}>
                <Icon size={20} />
            </div>
            <h4 className={cn("font-black tracking-tight mb-1", primary ? "text-white" : "text-slate-900")}>
                {title}
            </h4>
            <p className={cn("text-xs leading-relaxed", primary ? "text-white/70" : "text-slate-500")}>
                {description}
            </p>
        </Link>
    );
}

function StatusItem({ icon: Icon, label, status }) {
    return (
        <div className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-3 text-white/70 font-medium">
                <Icon size={16} strokeWidth={2.5} />
                <span>{label}</span>
            </div>
            <span className="font-bold text-white/90">{status}</span>
        </div>
    );
}

// Internal utility duplicated to avoid import complexity in this specific file structure
function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
