"use client";

import React, { useState, useEffect, useId } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Check,
    X,
    Loader2,
    Sparkles,
    IdCard,
    CalendarCheck,
    GraduationCap,
    BookOpen,
    MessageSquare,
    Smartphone,
    Zap,
    LogOut,
    ArrowRight,
    AlertCircle
} from "lucide-react";

// Supported Payment Chips
function PaymentChips() {
    return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap opacity-85" aria-label="Supported Payment Methods">
            <span className="h-5 px-1.5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[8px] font-black text-[#5F259F] tracking-tighter">
                UPI
            </span>
            <span className="h-5 px-1.5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7.5px] font-black text-[#097938] tracking-tighter">
                RuPay
            </span>
            <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[8px] font-black text-[#1A1F71] tracking-tighter">
                VISA
            </span>
            <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EB001B] -mr-1 opacity-90 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] opacity-90 inline-block" />
            </span>
            <span className="h-5 px-1.5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-slate-700">
                NetBanking
            </span>
            <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-[#4285F4]">
                GPay
            </span>
            <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-black">
                Pay
            </span>
        </div>
    );
}

const ERP_FEATURES = [
    { id: "id_card", name: "Smart Digital QR ID Card", icon: IdCard },
    { id: "attendance", name: "Daily Attendance & Instant Alerts", icon: CalendarCheck },
    { id: "results", name: "Report Cards, Marksheets & Syllabus", icon: GraduationCap },
    { id: "homework", name: "Assignments, Notes & Timetable", icon: BookOpen },
    { id: "messaging", name: "Direct Teacher & School Messaging", icon: MessageSquare },
    { id: "sync", name: "Real-Time Web & Mobile Cloud Sync", icon: Smartphone },
    { id: "notices", name: "Official Circulars & Priority Alerts", icon: Zap },
];

export default function StudentPaywallPage() {
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();

    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);

    const titleId = useId();

    // 1. Fetch live subscription & pricing status
    const loadStatus = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/student/subscription/status");
            const data = await res.json();
            if (res.ok && data.success) {
                setStatusData(data);
                // If student doesn't need payment, redirect to dashboard
                if (!data.needsPayment) {
                    router.push("/student/dashboard");
                }
            } else {
                setErrorMsg(data.error || "Failed to load payment details");
            }
        } catch (err) {
            console.error("Status check failed:", err);
            setErrorMsg("Network error. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    // 2. Load Razorpay SDK
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (typeof window !== "undefined" && window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // 3. Initiate Payment
    const handlePayNow = async () => {
        setErrorMsg(null);
        setPaymentLoading(true);

        try {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(10);
            }

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                setErrorMsg("Failed to initialize payment gateway. Please check your internet connection.");
                setPaymentLoading(false);
                return;
            }

            // Create Razorpay order
            const orderRes = await fetch("/api/v1/student/subscription/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const orderData = await orderRes.json();

            if (!orderRes.ok || !orderData.success) {
                setErrorMsg(orderData.error || "Unable to create payment order. Please try again.");
                setPaymentLoading(false);
                return;
            }

            // Launch Razorpay Checkout Modal
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || "INR",
                name: orderData.instituteName || "Student ERP Portal",
                description: orderData.title || "Annual Student Access Fee",
                order_id: orderData.orderId,
                prefill: {
                    name: orderData.prefill?.name || session?.user?.name || "",
                    email: orderData.prefill?.email || session?.user?.email || "",
                    contact: orderData.prefill?.contact || session?.user?.phone || ""
                },
                theme: {
                    color: "#151515"
                },
                modal: {
                    ondismiss: () => {
                        setPaymentLoading(false);
                    }
                },
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch("/api/v1/student/subscription/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok && verifyData.success) {
                            setPaymentSuccess(true);
                            setSuccessDetails(verifyData);
                            // Refresh NextAuth session to unlock needsSubscriptionPayment flag
                            await updateSession();
                        } else {
                            setErrorMsg(verifyData.error || "Payment verification failed. Please contact support.");
                        }
                    } catch (verifyErr) {
                        console.error("Verification error:", verifyErr);
                        setErrorMsg("Network error while verifying payment. If funds were deducted, access will activate shortly.");
                    } finally {
                        setPaymentLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (resp) => {
                setErrorMsg(resp.error?.description || "Payment failed or was cancelled.");
                setPaymentLoading(false);
            });
            rzp.open();

        } catch (err) {
            console.error("Payment initiation error:", err);
            setErrorMsg("An unexpected error occurred. Please try again.");
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F5F7] text-slate-900">
                <Loader2 className="w-8 h-8 text-[#45C48C] animate-spin mb-4" />
                <p className="text-xs font-medium text-slate-600 tracking-wide">Checking student portal subscription...</p>
            </div>
        );
    }

    const pricing = statusData?.pricing || {
        basePrice: 25,
        gstAmount: 4.5,
        gatewayFee: 0.5,
        totalAmount: 30
    };

    const formattedExpiry = statusData?.instituteCycleEnd
        ? new Date(statusData.instituteCycleEnd).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
          })
        : "End of Academic Session";

    const instituteName = session?.user?.institute?.name || statusData?.instituteName || "Student ERP Portal";
    const studentName = session?.user?.name || "Student";
    const enrollment = session?.user?.enrollmentNumber || "";

    return (
        <div className="min-h-screen bg-[#F4F5F7] text-slate-900 flex flex-col justify-between selection:bg-[#45C48C]/30 antialiased font-sans">
            {/* ── Top Bar (Light theme matching the student portal) ── */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/90 bg-white sticky top-0 z-30 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        {instituteName[0]?.toUpperCase() || "S"}
                    </div>
                    <div>
                        <h1 className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[200px] sm:max-w-xs">
                            {instituteName}
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium">Digital Campus &amp; Student Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {studentName && (
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-xs font-semibold text-slate-800">{studentName}</span>
                            {enrollment && <span className="text-[10px] text-slate-500 font-mono">{enrollment}</span>}
                        </div>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                        title="Sign Out"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* ── Main Content Area ──────────────────────────────────── */}
            <main className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
                {paymentSuccess ? (
                    /* ══════════════════════════════════════════════════════════
                       SUCCESS STATE: Apple-style fluid confirmation
                    ══════════════════════════════════════════════════════════ */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", damping: 26, stiffness: 320 }}
                        className="w-full max-w-[480px] bg-white text-slate-900 rounded-none p-8 sm:p-10 shadow-xl border border-slate-200 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 16, stiffness: 360, delay: 0.1 }}
                            className="w-16 h-16 rounded-full bg-[#E2F3EB] text-[#1B8A5C] flex items-center justify-center mx-auto mb-5"
                        >
                            <Check className="w-9 h-9 stroke-[3]" />
                        </motion.div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                            Access Activated!
                        </h2>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            Your payment of <span className="font-bold text-slate-900">₹{pricing.totalAmount}.00</span> was confirmed.
                            Your Smart Digital ID and ERP features are unlocked.
                        </p>

                        <div className="bg-[#F7F7F7] border border-slate-200 rounded-xl p-4 text-left space-y-2 mb-6 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Invoice:</span>
                                <span className="font-mono font-bold text-slate-800">{successDetails?.invoiceNumber || "VERIFIED"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Valid Through:</span>
                                <span className="font-semibold text-emerald-700">{formattedExpiry}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status:</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active &amp; Verified
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.push("/student/dashboard")}
                            className="w-full h-11 bg-[#151515] hover:bg-black text-white font-medium text-sm rounded-[10px] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                            <span>Enter Student Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                ) : (
                    /* ══════════════════════════════════════════════════════════
                       SPLIT-PANEL PAYWALL CONTAINER (Zero Radius, High Contrast)
                    ══════════════════════════════════════════════════════════ */
                    <div className="relative w-full max-w-[960px] min-h-[560px] bg-[#F7F7F7] rounded-none overflow-hidden shadow-xl flex flex-col md:flex-row border border-slate-300/80">
                        {/* ──────────────────────────────────────────────────────
                            LEFT PANEL: Dark Feature Showcase (#232323)
                        ────────────────────────────────────────────────────── */}
                        <div className="hidden md:flex flex-1 bg-[#232323] text-[#F2F2F2] p-8 flex-col justify-center select-none border-r border-[#303030]">
                            {/* Section Header */}
                            <div className="mb-3 px-3.5">
                                <h3 className="text-sm font-semibold text-white tracking-tight">Included Features</h3>
                                <p className="text-[12px] text-[#A3A3A3] mt-0.5">Everything unlocked upon portal activation</p>
                            </div>

                            {/* Zebra Feature Rows */}
                            <div className="space-y-1">
                                {ERP_FEATURES.map((item, idx) => {
                                    const Icon = item.icon;
                                    const isOdd = idx % 2 === 0;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                type: "spring",
                                                damping: 24,
                                                stiffness: 300,
                                                delay: 0.05 + idx * 0.03
                                            }}
                                            className={`flex items-center gap-3.5 h-11 px-3.5 text-[14.5px] font-normal tracking-normal transition-colors ${
                                                isOdd ? "bg-[#424242] rounded-[10px]" : "bg-transparent"
                                            }`}
                                        >
                                            {/* Bare glyph icon */}
                                            <span className="w-5 h-5 flex items-center justify-center text-white/90 shrink-0">
                                                <Icon className="w-4 h-4" />
                                            </span>

                                            {/* Feature Label */}
                                            <span className="flex-1 truncate text-[#F2F2F2]">
                                                {item.name}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ──────────────────────────────────────────────────────
                            RIGHT PANEL: Light Plan Picker (#F7F7F7)
                        ────────────────────────────────────────────────────── */}
                        <div className="flex-1 bg-[#F7F7F7] p-8 sm:p-10 flex flex-col justify-center items-center relative overflow-y-auto">
                            <div className="w-full max-w-[380px] flex flex-col items-center text-center">
                                {/* Brand Crest Icon */}
                                <div className="w-10 h-10 rounded-[10px] bg-[#111111] flex items-center justify-center text-white shadow-xs mb-3.5">
                                    <Sparkles className="w-5 h-5 text-[#45C48C]" />
                                </div>

                                {/* Title with tight tracking */}
                                <h2
                                    id={titleId}
                                    className="text-[26px] sm:text-[28px] font-bold text-[#111111] tracking-[-0.02em] leading-tight mb-1"
                                >
                                    Activate Your Portal
                                </h2>

                                {/* Subtitle */}
                                <p className="text-[14.5px] sm:text-[15.5px] text-[#6B6B6B] font-normal leading-snug mb-6">
                                    Annual digital student pass for {instituteName}
                                </p>

                                {/* Error Banner */}
                                {errorMsg && (
                                    <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2 text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div className="flex-1">{errorMsg}</div>
                                        <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* ── Single Plan Option Card: Academic Session (No standard access, no valid until) ── */}
                                <div className="w-full relative mb-5">
                                    <div className="relative w-full h-[64px] px-4 rounded-[12px] border-[1.75px] border-[#45C48C] bg-white flex items-center justify-between text-left shadow-2xs">
                                        {/* Badge straddling top border */}
                                        <div className="absolute -top-3 right-3.5 h-[22px] px-2.5 rounded-full bg-[#1B8A5C] text-white text-[11px] font-semibold flex items-center justify-center tracking-tight shadow-2xs z-20">
                                            OFFICIAL PASS • ALL FEATURES
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Active Radio Ring */}
                                            <span className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#45C48C] flex items-center justify-center">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#45C48C]" />
                                            </span>

                                            <div>
                                                <div className="text-[15px] font-bold text-[#111111] leading-tight">
                                                    Academic Session
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[18px] font-bold text-[#111111] tabular-nums tracking-tight">
                                                ₹{pricing.totalAmount}.00
                                            </span>
                                            <span className="text-[11.5px] text-[#6B6B6B] font-normal block leading-tight">/ session</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary CTA Button (Instant response on press) */}
                                <button
                                    type="button"
                                    onClick={handlePayNow}
                                    disabled={paymentLoading}
                                    className="w-full h-[46px] bg-[#151515] hover:bg-black text-white font-medium text-[15.5px] rounded-[12px] transition-transform active:scale-[0.985] flex items-center justify-center gap-2 mb-3 cursor-pointer disabled:opacity-75 shadow-xs"
                                >
                                    {paymentLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white/80" />
                                    ) : (
                                        <span>Pay</span>
                                    )}
                                </button>

                                {/* Pricing Breakdown Caption */}
                                <p className="text-[11px] text-[#6B6B6B] leading-tight text-center mb-3.5 px-2">
                                    Base ₹{pricing.basePrice} + 18% GST (₹{pricing.gstAmount}) + PG fee (₹{pricing.gatewayFee}). Instant activation on payment.
                                </p>

                                {/* Trust Pill */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F3EB] text-[#1E7F57] text-[11px] font-semibold mb-3.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#1E7F57]" />
                                    <span>Pay Safe &amp; Secure via Razorpay</span>
                                </div>

                                {/* Payment Method Chips */}
                                <PaymentChips />

                                {/* Mobile Features Breakdown Accordion */}
                                <div className="mt-4 md:hidden w-full">
                                    <button
                                        type="button"
                                        onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                                        className="text-xs text-[#6B6B6B] hover:text-[#111] font-medium underline py-1"
                                    >
                                        {isSheetExpanded ? "Hide feature breakdown" : "See included portal features"}
                                    </button>

                                    <AnimatePresence>
                                        {isSheetExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-[#232323] text-white rounded-xl p-4 mt-2 text-left space-y-2 text-xs"
                                            >
                                                {ERP_FEATURES.map((f) => {
                                                    const Icon = f.icon;
                                                    return (
                                                        <div key={f.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
                                                            <Icon className="w-3.5 h-3.5 text-white/80 shrink-0" />
                                                            <span className="text-white/90">{f.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <footer className="py-3 px-6 text-center text-[11px] text-slate-500 border-t border-slate-200/90 bg-white/50">
                <span>Secured 256-bit SSL Gateway • Official Student ERP Portal</span>
            </footer>
        </div>
    );
}
