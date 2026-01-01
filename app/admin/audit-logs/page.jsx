"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { History, User, Activity, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/v1/audit-logs");
            if (!res.ok) {
                throw new Error(`Failed to fetch logs: ${res.status}`);
            }
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (error) {
            console.error(error);
            // TODO: Show user-facing error (e.g., toast notification or error state)
        } finally {
            setLoading(false);
        }
    };
    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="bg-premium-blue/10 p-3 rounded-xl text-premium-blue">
                    <History size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500">System activity and security trail.</p>
                </div>
            </div>

            <Card className="border-transparent shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actor</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map(log => (
                                <tr key={log._id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                        {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-900">
                                                {log.actor?.profile?.firstName || "System"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-700 capitalize">
                                            {log.action?.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-slate-700">
                                                {log.resource?.type}
                                                {log.details?.name && <span className="text-slate-500 font-normal"> • {log.details.name}</span>}
                                            </span>
                                            {log.details && typeof log.details === 'object' && !Array.isArray(log.details) && (() => {
                                                const SENSITIVE_KEYS = ['password', 'token', 'secret', 'auth', 'credit', 'card', 'cvv'];
                                                const filteredDetails = Object.entries(log.details)
                                                    .filter(([k]) => k !== 'name' && k !== 'role' && !SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s)))
                                                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                                                    .join(", ");

                                                return filteredDetails ? (
                                                    <p className="text-xs text-slate-500 max-w-md truncate" title={filteredDetails}>
                                                        {filteredDetails}
                                                    </p>
                                                ) : null;
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-12 text-slate-400">
                                        <Activity size={32} className="mx-auto mb-2 opacity-20" />
                                        No recent activity recorded.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
