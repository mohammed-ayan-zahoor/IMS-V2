"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

export default function SessionManager() {
    const toast = useToast();
    const { refreshSessions } = useAcademicSession();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [activating, setActivating] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [formData, setFormData] = useState({
        sessionName: "",
        startDate: "",
        endDate: ""
    });

    // Fetch sessions
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/sessions");
            const data = await res.json();
            
            if (res.ok) {
                setSessions(data.sessions || []);
            } else {
                toast.error(data.error || "Failed to load sessions");
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        setCreating(true);

        try {
            if (!formData.sessionName || !formData.startDate || !formData.endDate) {
                toast.error("Please fill all fields");
                setCreating(false);
                return;
            }

            // Validate session name
            if (!formData.sessionName.trim() || formData.sessionName.trim().length < 2) {
                toast.error("Please enter a valid session name (e.g. 2025-2026, 2025-26 Odd, or Fall 2025)");
                setCreating(false);
                return;
            }

            const res = await fetch("/api/v1/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionName: formData.sessionName.trim(),
                    startDate: new Date(formData.startDate),
                    endDate: new Date(formData.endDate)
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Session ${formData.sessionName} created successfully`);
                setFormData({ sessionName: "", startDate: "", endDate: "" });
                setShowCreateForm(false);
                // Refresh both local list and global session selector
                await fetchSessions();
                refreshSessions();
            } else {
                toast.error(data.error || "Failed to create session");
                // If it's a duplicate error, refresh list to show existing session
                if (data.error?.includes("already exists")) {
                    await fetchSessions();
                }
            }
        } catch (error) {
            console.error("Error creating session:", error);
            toast.error("Failed to create session");
        } finally {
            setCreating(false);
        }
    };

    const handleActivateSession = async (sessionId, sessionName) => {
        try {
            setActivating(sessionId);

            const res = await fetch(`/api/v1/sessions/activate/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Session ${sessionName} activated`);
                fetchSessions();
                refreshSessions();
            } else {
                toast.error(data.error || "Failed to activate session");
            }
        } catch (error) {
            console.error("Error activating session:", error);
            toast.error("Failed to activate session");
        } finally {
            setActivating(null);
        }
    };

    const handleDeleteSession = async (sessionId, sessionName) => {
        try {
            setDeleting(sessionId);

            const res = await fetch(`/api/v1/sessions/delete/${sessionId}`, {
                method: "DELETE"
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Session ${sessionName} deleted`);
                fetchSessions();
                refreshSessions();
            } else {
                toast.error(data.error || "Failed to delete session");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            toast.error("Failed to delete session");
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Academic Sessions & Terms</h3>
                    <p className="text-sm text-slate-500 mt-1">Create and manage institutional academic terms (e.g. 2025-2026, 2025-26 Odd, Fall 2025)</p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus size={18} />
                    New Session
                </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                    <form onSubmit={handleCreateSession} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700">Session / Term Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2025-2026 or 2025-26 (Odd)"
                                    value={formData.sessionName}
                                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                                    className="w-full px-4 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-mono"
                                    maxLength="40"
                                    required
                                />
                                <p className="text-[11px] text-slate-400">Annual year or semester term (e.g. 6-month term)</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700">Start Date *</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700">End Date *</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Create Session
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sessions List */}
            <div className="space-y-3">
                {sessions.length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-8 text-center border border-slate-200">
                        <Calendar className="mx-auto mb-3 text-slate-300" size={32} />
                        <p className="text-slate-500 font-medium">No sessions created yet</p>
                        <p className="text-sm text-slate-400 mt-1">Create your first academic session to get started</p>
                    </div>
                ) : (
                    sessions.map((sess) => (
                        <div
                            key={sess._id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                sess.isActive
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100">
                                        <Calendar size={20} className="text-slate-600" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold text-slate-900">{sess.sessionName}</h4>
                                            {sess.isActive && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                                    <CheckCircle size={12} />
                                                    ACTIVE
                                                </span>
                                            )}
                                            {!sess.isActive && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                                    <Clock size={12} />
                                                    INACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(sess.startDate)} → {formatDate(sess.endDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!sess.isActive && (
                                        <button
                                            onClick={() => handleActivateSession(sess._id, sess.sessionName)}
                                            disabled={activating === sess._id}
                                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                        >
                                            {activating === sess._id ? (
                                                <Loader2 className="animate-spin" size={14} />
                                            ) : (
                                                <CheckCircle size={14} />
                                            )}
                                            Activate
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete session ${sess.sessionName}? This cannot be undone.`)) {
                                                handleDeleteSession(sess._id, sess.sessionName);
                                            }
                                        }}
                                        disabled={deleting === sess._id || sess.isActive}
                                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={sess.isActive ? "Cannot delete active session" : ""}
                                    >
                                        {deleting === sess._id ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Session Management Info</p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                        <li>Only one session can be active at a time</li>
                        <li>Sessions cannot be edited after creation</li>
                        <li>Batches and enrollments will be linked to sessions</li>
                        <li>Dashboard will show data for the active session</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
