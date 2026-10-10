"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  Sparkles, 
  Check, 
  Loader2 
} from "lucide-react";

// Official brand SVG marks for AI models
function OpenAIIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1683a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4021-.6815zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.407 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.6627zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4593a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z"/>
    </svg>
  );
}

function ClaudeIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  );
}

function DeepSeekIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  );
}

function GeminiIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
    </svg>
  );
}

// Payment Logo Chips (SVGs)
function PaymentChips() {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap opacity-80" aria-label="Supported Payment Methods">
      {/* Visa */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[8px] font-black text-[#1A1F71] tracking-tighter">
        VISA
      </span>
      {/* Mastercard */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-[#EB001B] -mr-1 opacity-90 inline-block" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] opacity-90 inline-block" />
      </span>
      {/* Amex */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-[#006FCF]">
        AMEX
      </span>
      {/* Discover */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[6.5px] font-bold text-[#FF6000]">
        DISC
      </span>
      {/* PayPal */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-[#003087]">
        PayPal
      </span>
      {/* Apple Pay */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-black">
        Pay
      </span>
      {/* Google Pay */}
      <span className="w-7 h-5 bg-white border border-[#E3E3E3] rounded-[3px] flex items-center justify-center text-[7px] font-bold text-[#4285F4]">
        GPay
      </span>
    </div>
  );
}

const DEFAULT_FEATURES = [
  { id: "gpt4o", name: "Unlimited Access to OpenAI GPT-4o", icon: OpenAIIcon, free: false, pro: true },
  { id: "claude", name: "Access to Claude 3.5 Sonnet", icon: ClaudeIcon, free: false, pro: true },
  { id: "deepseek", name: "Access to DeepSeek V3", icon: DeepSeekIcon, free: false, pro: true },
  { id: "gemini", name: "Access to Google Gemini", icon: GeminiIcon, free: false, pro: true },
  { id: "priority", name: "Priority AI Responses & Low Latency", icon: Zap, free: false, pro: true },
  { id: "sync", name: "Web - Mobile Real-Time Sync", icon: Smartphone, free: false, pro: true },
  { id: "unlimited", name: "Unlimited Smart Conversations", icon: Sparkles, free: false, pro: true },
];

export default function UpgradePlanModal({
  isOpen = true,
  onClose = () => {},
  onSelectPlan = () => {},
  features = DEFAULT_FEATURES,
  weeklyPrice = 5.99,
  yearlyPrice = 199.99,
  appName = "Chat With AI Bot",
  triggerRef = null
}) {
  const [selectedPlan, setSelectedPlan] = useState("yearly"); // "yearly" | "weekly"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Compute exact discount percentage: 1 - ((yearly / 52) / weekly)
  const weeklyEquivalent = yearlyPrice / 52;
  const savingsPercent = Math.max(1, Math.round((1 - (weeklyEquivalent / weeklyPrice)) * 100));

  const modalRef = useRef(null);
  const titleId = useId();

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Spring transition presets aligned to Apple fluid principles
  const springModal = {
    type: "spring",
    damping: 28,
    stiffness: 300,
    mass: 0.8
  };

  const springRing = {
    type: "spring",
    damping: 30,
    stiffness: 400
  };

  const handleContinue = async () => {
    if (isSubmitting || isSuccess) return;
    setIsSubmitting(true);

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
      await onSelectPlan(selectedPlan);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 selection:bg-[#45C48C]/20">
          {/* ── Scrim ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer"
            aria-hidden="true"
          />

          {/* ── Modal Shell (0 Radius on desktop, hard designed contrast) ── */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.2, ease: [0.64, 0, 0.78, 0] } }}
            transition={springModal}
            className="relative z-10 w-full max-w-[960px] min-h-[620px] bg-[#F7F7F7] sm:rounded-none overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[96vh] md:max-h-[680px]"
          >
            {/* Close Button (Small visual 16px, 44x44 touch hit target) */}
            <button
              onClick={onClose}
              aria-label="Close upgrade dialog"
              className="absolute top-4 right-4 z-20 w-11 h-11 flex items-center justify-center text-[#444] hover:text-[#111] transition-colors rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#45C48C]"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>

            {/* ══════════════════════════════════════════════════════════
                LEFT PANEL: Dark Comparison Table (#232323)
            ══════════════════════════════════════════════════════════ */}
            <div className="hidden md:flex flex-1 bg-[#232323] text-[#F2F2F2] p-8 flex-col justify-center select-none border-r border-[#303030]">
              {/* Column Headers */}
              <div className="flex justify-end items-center gap-0 text-[13px] font-normal text-[#A3A3A3] mb-3 px-3">
                <span className="w-12 text-center">Free</span>
                <span className="w-12 text-center text-[#45C48C] font-semibold">Pro</span>
              </div>

              {/* Zebra Feature Rows */}
              <div className="space-y-1">
                {features.map((item, idx) => {
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
                        delay: 0.06 + idx * 0.03
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

                      {/* Free Column Status Circle (Muted Gray X) */}
                      <span className="w-12 flex justify-center items-center">
                        <span className="w-5 h-5 rounded-full bg-[#8E8E8E] text-[#1C1C1C] flex items-center justify-center">
                          <X className="w-3 h-3 stroke-[2.5]" />
                        </span>
                      </span>

                      {/* Pro Column Status Circle (Vibrant Green Check with Spring Wave) */}
                      <span className="w-12 flex justify-center items-center">
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            damping: 18,
                            stiffness: 350,
                            delay: 0.12 + idx * 0.035
                          }}
                          className="w-5 h-5 rounded-full bg-[#45C48C] text-white flex items-center justify-center shadow-xs"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </motion.span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                RIGHT PANEL: Light Plan Picker (#F7F7F7)
            ══════════════════════════════════════════════════════════ */}
            <div className="flex-1 bg-[#F7F7F7] p-8 sm:p-10 flex flex-col justify-center items-center relative overflow-y-auto">
              <div className="w-full max-w-[380px] flex flex-col items-center text-center">
                {/* App Icon Tile */}
                <div className="w-10 h-10 rounded-[10px] bg-[#111111] flex items-center justify-center text-white shadow-xs mb-3.5">
                  <Sparkles className="w-5 h-5 text-[#45C48C]" />
                </div>

                {/* Title */}
                <h2 
                  id={titleId} 
                  className="text-[26px] sm:text-[28px] font-bold text-[#111111] tracking-[-0.02em] leading-tight mb-1"
                >
                  Upgrade Your Plan
                </h2>

                {/* Subtitle */}
                <p className="text-[15px] sm:text-[16px] text-[#6B6B6B] font-normal leading-snug mb-7">
                  Unlock the full potential of {appName}
                </p>

                {/* ── Plan Options (Relative container with single sliding ring) ── */}
                <div 
                  className="w-full relative flex flex-col gap-3.5 mb-6" 
                  role="radiogroup" 
                  aria-label="Subscription plan choice"
                >
                  {/* Sliding Spring Ring (Interruptible single-ring physics) */}
                  <motion.div
                    className="absolute left-0 right-0 h-[64px] border-[1.75px] border-[#45C48C] rounded-[12px] pointer-events-none z-10"
                    initial={false}
                    animate={{
                      y: selectedPlan === "yearly" ? 0 : 78
                    }}
                    transition={springRing}
                  />

                  {/* Plan 1: Yearly */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedPlan === "yearly"}
                    onClick={() => setSelectedPlan("yearly")}
                    className="relative w-full h-[64px] px-4 rounded-[12px] border-[1.5px] border-[#C4C4C4] bg-white flex items-center justify-between text-left transition-transform active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#45C48C]"
                  >
                    {/* Badge straddling top border */}
                    <div className="absolute -top-3 right-3.5 h-[22px] px-2.5 rounded-full bg-[#1B8A5C] text-white text-[11px] font-semibold flex items-center justify-center tracking-tight shadow-2xs z-20">
                      Save {savingsPercent}%
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Radio Ring */}
                      <span className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        selectedPlan === "yearly" ? "border-[#45C48C]" : "border-[#8E8E8E]"
                      }`}>
                        {selectedPlan === "yearly" && (
                          <motion.span 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            transition={{ type: "spring", damping: 20, stiffness: 400 }}
                            className="w-2.5 h-2.5 rounded-full bg-[#45C48C]" 
                          />
                        )}
                      </span>

                      <div>
                        <div className="text-[15px] font-bold text-[#111111] leading-tight">Yearly</div>
                        <div className="text-[12.5px] text-[#6B6B6B] font-normal leading-tight mt-0.5">
                          ${yearlyPrice.toFixed(2)} / year
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[17px] font-bold text-[#111111] tabular-nums tracking-tight">
                        ${weeklyEquivalent.toFixed(2)}
                      </span>
                      <span className="text-[12px] text-[#6B6B6B] font-normal block leading-tight">/ week</span>
                    </div>
                  </button>

                  {/* Plan 2: Weekly */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedPlan === "weekly"}
                    onClick={() => setSelectedPlan("weekly")}
                    className="relative w-full h-[64px] px-4 rounded-[12px] border-[1.5px] border-[#C4C4C4] bg-white flex items-center justify-between text-left transition-transform active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#45C48C]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Radio Ring */}
                      <span className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        selectedPlan === "weekly" ? "border-[#45C48C]" : "border-[#8E8E8E]"
                      }`}>
                        {selectedPlan === "weekly" && (
                          <motion.span 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            transition={{ type: "spring", damping: 20, stiffness: 400 }}
                            className="w-2.5 h-2.5 rounded-full bg-[#45C48C]" 
                          />
                        )}
                      </span>

                      <div>
                        <div className="text-[15px] font-bold text-[#111111] leading-tight">Weekly</div>
                        <div className="text-[12.5px] text-[#6B6B6B] font-normal leading-tight mt-0.5">
                          Billed weekly, cancel anytime
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[17px] font-bold text-[#111111] tabular-nums tracking-tight">
                        ${weeklyPrice.toFixed(2)}
                      </span>
                      <span className="text-[12px] text-[#6B6B6B] font-normal block leading-tight">/ week</span>
                    </div>
                  </button>
                </div>

                {/* Primary CTA Button */}
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  className="w-full h-[42px] bg-[#151515] hover:bg-black text-white font-medium text-[15.5px] rounded-[12px] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mb-3 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/80" />
                  ) : isSuccess ? (
                    <span className="flex items-center gap-1.5 text-[#45C48C]">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Unlocked!</span>
                    </span>
                  ) : (
                    <span>Continue · {selectedPlan === "yearly" ? `$${yearlyPrice.toFixed(2)}/yr` : `$${weeklyPrice.toFixed(2)}/wk`}</span>
                  )}
                </button>

                {/* Legal & Auto-Renewal Notice */}
                <p className="text-[11px] text-[#555555] leading-normal text-center mb-4 px-2">
                  Renews automatically at {selectedPlan === "yearly" ? `$${yearlyPrice.toFixed(2)}/year` : `$${weeklyPrice.toFixed(2)}/week`}. Cancel anytime in Settings. By continuing you agree to our{" "}
                  <a href="/terms" className="underline hover:text-black">Terms of Use</a>,{" "}
                  <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>, and{" "}
                  <a href="/refund" className="underline hover:text-black">Refund Policy</a>.
                </p>

                {/* Trust Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F3EB] text-[#1E7F57] text-[11px] font-semibold mb-3.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E7F57]" />
                  <span>Pay Safe &amp; Secure</span>
                </div>

                {/* Payment Chips */}
                <PaymentChips />

                {/* Mobile Features Disclosure Toggle */}
                <div className="mt-4 md:hidden w-full">
                  <button
                    type="button"
                    onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                    className="text-xs text-[#6B6B6B] hover:text-[#111] font-medium underline py-1"
                  >
                    {isSheetExpanded ? "Hide feature breakdown" : "See what's included in Pro"}
                  </button>

                  <AnimatePresence>
                    {isSheetExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[#232323] text-white rounded-xl p-4 mt-2 text-left space-y-2 text-xs"
                      >
                        {features.map((f) => (
                          <div key={f.id} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                            <span className="text-white/80">{f.name}</span>
                            <span className="text-[#45C48C] font-bold">✓ Pro</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
