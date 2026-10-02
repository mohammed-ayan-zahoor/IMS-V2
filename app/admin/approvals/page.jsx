"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    ShieldCheck, 
    Check, 
    X, 
    Clock, 
    AlertCircle, 
    RefreshCw, 
    User, 
    Tag, 
    SlidersHorizontal,
    CheckCircle2,
    XCircle,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";

export default function ApprovalsPage() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "rejected" | "all"
    const [actionLoading, setActionLoading] = useState({});
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [feedback, setFeedback] = useState(null);

    const isMasterAdmin = session?.user?.isMasterAdmin || session?.user?.role === 'super_admin';

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/approvals?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
                setPendingCount(data.pendingCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch approvals:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchApprovals();
        }
    }, [session, activeTab]);

    const handleAction = async (requestId, action, note = "") => {
        try {
            setActionLoading(prev => ({ ...prev, [requestId]: true }));
            const res = await fetch(`/api/v1/approvals/${requestId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, note })
            });

            const data = await res.json();
            if (res.ok) {
                setFeedback({
                    type: "success",
                    message: action === 'approve' ? "Request approved successfully!" : "Request rejected."
                });
                setTimeout(() => setFeedback(null), 4000);
                setRejectModalOpen(false);
                setRejectNote("");
                fetchApprovals();
            } else {
                setFeedback({ type: "error", message: data.error || "Action failed" });
                setTimeout(() => setFeedback(null), 4000);
            }
        } catch (err) {
            console.error(`Approval error:`, err);
            setFeedback({ type: "error", message: "Network error occurred" });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const renderActionBadge = (action) => {
        switch (action) {
            case 'discount':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                        <Tag className="w-3.5 h-3.5" />
                        Fee Discount
                    </span>
                );
            case 'approval_settings':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Approval Rules
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {action}
                    </span>
                );
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                        <Clock className="w-3 h-3 animate-pulse" />
                        Pending Approval
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                        <XCircle className="w-3 h-3" />
                        Rejected
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 dark:border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Approval Requests
                        </h1>
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Review and action gated requests requiring Master Admin approval.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/settings/master-admin"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Configure Rules
                    </Link>
                    <button
                        onClick={fetchApprovals}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Non-Master Admin notice */}
            {!isMasterAdmin && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <span className="font-semibold">View-only mode:</span> You are currently viewing approval requests as an admin. Only the designated Master Admin or Super Admin can approve or reject these items.
                    </div>
                </div>
            )}

            {/* Feedback notification banner */}
            {feedback && (
                <div className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between transition-all ${
                    feedback.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' 
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
                }`}>
                    <span>{feedback.message}</span>
                    <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                {[
                    { id: "pending", label: "Pending", count: pendingCount },
                    { id: "approved", label: "Approved" },
                    { id: "rejected", label: "Rejected" },
                    { id: "all", label: "All History" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-60" />
                    <p className="text-sm">Loading approval requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No {activeTab} requests found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {activeTab === 'pending'
                            ? "All clear! There are currently no actions waiting for your approval."
                            : "No approval history recorded under this filter."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => {
                        const isProcessing = actionLoading[req._id];
                        const requesterName = req.requestedBy?.name || `${req.requestedBy?.profile?.firstName || ''} ${req.requestedBy?.profile?.lastName || ''}`.trim() || req.requestedBy?.email || "Unknown User";

                        return (
                            <div
                                key={req._id}
                                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    {/* Left: Action, details, and payload summary */}
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {renderActionBadge(req.action)}
                                            {renderStatusBadge(req.status)}
                                            <span className="text-xs text-slate-400">
                                                {new Date(req.createdAt).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        {/* Action Specific Display */}
                                        {req.action === 'discount' && (
                                            <div className="space-y-1">
                                                <div className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    Discount Amount: <span className="text-rose-600 dark:text-rose-400">₹{req.payload?.discount?.amount?.toLocaleString() || 0}</span>
                                                </div>
                                                {req.payload?.discount?.reason && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                                        "{req.payload.discount.reason}"
                                                    </p>
                                                )}
                                                {req.resourceId && (
                                                    <div className="text-xs text-slate-400 font-mono">
                                                        Fee Record: {req.resourceId}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {req.action === 'approval_settings' && (
                                            <div className="space-y-1">
                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    Approval Rules Configuration Change
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    Rules: {JSON.stringify(req.payload?.rules || {})}
                                                </div>
                                            </div>
                                        )}

                                        {/* Requester info */}
                                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Requested by: <strong className="text-slate-700 dark:text-slate-300">{requesterName}</strong> ({req.requestedBy?.email})</span>
                                        </div>

                                        {/* Reviewed details */}
                                        {req.status !== 'pending' && (
                                            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                Reviewed by <strong>{req.reviewedBy?.name || req.reviewedBy?.email || 'Master Admin'}</strong> on {new Date(req.reviewedAt).toLocaleDateString()}
                                                {req.reviewNote && <span className="italic block text-slate-600 dark:text-slate-400 mt-0.5">Note: "{req.reviewNote}"</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    {req.status === 'pending' && isMasterAdmin && (
                                        <div className="flex items-center gap-2 self-start md:self-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setRejectModalOpen(true);
                                                }}
                                                disabled={isProcessing}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(req._id, 'approve')}
                                                disabled={isProcessing}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition disabled:opacity-50"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                {isProcessing ? "Processing..." : "Approve & Apply"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rejection Modal */}
            {rejectModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Reject Request
                            </h3>
                            <p className="text-xs text-slate-500">
                                Provide an optional note explaining why this request was declined.
                            </p>
                        </div>

                        <div>
                            <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="E.g. Maximum discount policy exceeded; please consult accounts."
                                rows={3}
                                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setRejectModalOpen(false);
                                    setRejectNote("");
                                }}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(selectedRequest._id, 'reject', rejectNote)}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
