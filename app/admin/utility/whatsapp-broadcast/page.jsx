"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Users, Layers3, BookOpen, Phone, Send, AlertTriangle, CheckCircle2, XCircle, Loader2, Settings, ChevronDown, X, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

const AUDIENCE_OPTIONS = [
    { value: "all",    label: "All Active Students",    icon: Users },
    { value: "batch",  label: "By Batch / Class",       icon: Layers3 },
    { value: "course", label: "By Course",              icon: BookOpen },
    { value: "custom", label: "Custom Numbers",         icon: Phone },
];

export default function WhatsAppBroadcastPage() {
    const toast = useToast();

    const [audience, setAudience]     = useState("all");
    const [batches,  setBatches]      = useState([]);
    const [courses,  setCourses]      = useState([]);
    const [batchId,  setBatchId]      = useState("");
    const [courseId, setCourseId]     = useState("");
    const [customRaw, setCustomRaw]   = useState(""); // comma/newline separated raw numbers
    const [message, setMessage]       = useState("");
    const [provider, setProvider]     = useState(null); // 'mock' | 'twilio' | 'meta'
    const [loading, setLoading]       = useState(true);
    const [sending, setSending]       = useState(false);
    const [result,   setResult]       = useState(null); // { sent, failed, skipped, total, errors }

    const textareaRef = useRef(null);

    // Fetch batches + courses + provider info in parallel
    useEffect(() => {
        const load = async () => {
            try {
                const [bRes, cRes, iRes] = await Promise.all([
                    fetch("/api/v1/batches"),
                    fetch("/api/v1/courses"),
                    fetch("/api/v1/institute/notifications/settings"),
                ]);
                if (bRes.ok) {
                    const d = await bRes.json();
                    setBatches(d.batches || []);
                }
                if (cRes.ok) {
                    const d = await cRes.json();
                    setCourses(d.courses || []);
                }
                if (iRes.ok) {
                    const d = await iRes.json();
                    setProvider(d.notifications?.whatsappProvider || "mock");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Parse custom phone numbers
    const customPhones = customRaw
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

    const charCount = message.length;
    const canSend = message.trim().length > 0 && !sending && (
        audience !== "batch"  || batchId ||
        audience !== "course" || courseId
    );

    const handleSend = async () => {
        if (!canSend) return;
        setSending(true);
        setResult(null);
        try {
            const body = { audience, message: message.trim() };
            if (audience === "batch")  body.batchId  = batchId;
            if (audience === "course") body.courseId  = courseId;
            if (audience === "custom") body.customPhones = customPhones;

            const res = await fetch("/api/v1/messaging/whatsapp/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Broadcast failed");
            setResult(data);
            if (data.sent > 0) toast.success(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-emerald-600" size={28} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-6">

            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                    <MessageSquare size={22} />
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-900">WhatsApp Broadcast</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Send a message to any group of students in one click.
                    </p>
                </div>
            </div>

            {/* Provider banners */}
            {provider === "mock" && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-xs font-bold leading-relaxed">
                        <span className="uppercase tracking-wide">Mock mode — </span>
                        messages will be logged to the server console but <strong>not delivered</strong>.{" "}
                        <Link href="/admin/settings?tab=apis&apiTab=msg91" className="underline underline-offset-2">
                            Configure a WhatsApp provider in Settings →
                        </Link>
                    </p>
                </div>
            )}
            {provider === "openwa" && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                    <p className="text-xs font-bold leading-relaxed">
                        <span className="uppercase tracking-wide">OpenWA Gateway Active — </span>
                        Broadcast messages will be dispatched directly through your self-hosted OpenWA WhatsApp instance without template restrictions.
                    </p>
                </div>
            )}
            {provider === "meta" && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-blue-500" />
                    <p className="text-xs font-bold leading-relaxed">
                        <span className="uppercase tracking-wide">Meta Cloud API — </span>
                        free-form messages are only delivered if the recipient has messaged you in the last 24 h.
                        For bulk outreach use a{" "}
                        <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            pre-approved template
                        </a>.
                    </p>
                </div>
            )}

            {/* Audience picker */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">1. Select Audience</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-slate-100">
                    {AUDIENCE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const active = audience === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => { setAudience(opt.value); setResult(null); }}
                                className={`flex flex-col items-center gap-2 py-5 px-3 text-xs font-bold transition-colors ${
                                    active
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                }`}
                            >
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                                <span className="text-center leading-snug">{opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Sub-selectors */}
                {audience === "batch" && (
                    <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Select Batch / Class</label>
                        <select
                            value={batchId}
                            onChange={e => setBatchId(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-medium"
                        >
                            <option value="">— Choose a batch —</option>
                            {batches.map(b => (
                                <option key={b._id} value={b._id}>
                                    {b.name}{b.course?.name ? ` — ${b.course.name}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {audience === "course" && (
                    <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Select Course</label>
                        <select
                            value={courseId}
                            onChange={e => setCourseId(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-medium"
                        >
                            <option value="">— Choose a course —</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                {audience === "custom" && (
                    <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            Phone Numbers
                            <span className="ml-2 text-slate-400 font-medium normal-case tracking-normal">
                                (comma or newline separated, +91 added automatically for 10-digit numbers)
                            </span>
                        </label>
                        <textarea
                            value={customRaw}
                            onChange={e => setCustomRaw(e.target.value)}
                            rows={4}
                            placeholder="9876543210, 9876543211&#10;+91 98765 43212"
                            className="w-full px-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-mono resize-none"
                        />
                        {customPhones.length > 0 && (
                            <p className="text-[11px] text-emerald-700 font-bold">
                                {customPhones.length} number{customPhones.length !== 1 ? "s" : ""} parsed
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Message composer */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">2. Compose Message</h2>
                    <span className={`text-[11px] font-bold tabular-nums ${charCount > 4000 ? "text-red-500" : "text-slate-400"}`}>
                        {charCount} / 4096
                    </span>
                </div>
                <div className="p-5">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        maxLength={4096}
                        rows={6}
                        placeholder="Type your message here… e.g. 'Dear parent, tomorrow's class is rescheduled to 10 AM. — [Institute Name]'"
                        className="w-full px-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-medium resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 font-medium mt-2">
                        Tip: personalization variables (student name, etc.) are not yet supported — the same message is sent to all recipients.
                    </p>
                </div>
            </div>

            {/* Send button */}
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 font-medium">
                    {audience === "all" && "All active students with a phone number will receive this message."}
                    {audience === "batch" && (batchId ? "Students enrolled in the selected batch." : "Select a batch above.")}
                    {audience === "course" && (courseId ? "Students enrolled in any batch of the selected course." : "Select a course above.")}
                    {audience === "custom" && `${customPhones.length} number${customPhones.length !== 1 ? "s" : ""} will receive this message.`}
                </p>
                <Button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {sending
                        ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                        : <><Send size={15} /> Send Broadcast</>
                    }
                </Button>
            </div>

            {/* Result card */}
            {result && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">Broadcast Result</h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <p className="text-2xl font-black text-emerald-700 tabular-nums">{result.sent}</p>
                                <p className="text-[11px] text-emerald-600 font-bold mt-1">Sent</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-2xl font-black text-red-600 tabular-nums">{result.failed}</p>
                                <p className="text-[11px] text-red-500 font-bold mt-1">Failed</p>
                            </div>
                            <div className="text-center p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <p className="text-2xl font-black text-slate-600 tabular-nums">{result.skipped}</p>
                                <p className="text-[11px] text-slate-500 font-bold mt-1">No Phone</p>
                            </div>
                        </div>

                        {result.failed > 0 && result.errors?.length > 0 && (
                            <details className="text-xs font-mono">
                                <summary className="cursor-pointer text-red-500 font-bold text-[11px] uppercase tracking-wide">
                                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""} — click to expand
                                </summary>
                                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto p-3 bg-red-50 rounded-lg border border-red-100">
                                    {result.errors.map((e, i) => (
                                        <div key={i} className="flex gap-2 text-red-700">
                                            <span className="shrink-0 font-bold">{e.phone}</span>
                                            <span className="opacity-70">— {e.error}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
