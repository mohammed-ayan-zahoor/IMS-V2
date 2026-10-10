"use client";

import React, { useState } from "react";
import UpgradePlanModal from "@/components/paywall/UpgradePlanModal";
import { Sparkles, ArrowRight } from "lucide-react";

export default function PaywallDemoPage() {
  const [isPaywallOpen, setIsPaywallOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-xs">
        <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-[#45C48C]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Paywall Modal Demo</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Apple-style split-panel paywall with fluid spring physics, single sliding selection ring, and zero-radius high contrast shell.
        </p>

        <button
          onClick={() => setIsPaywallOpen(true)}
          className="w-full py-3 px-6 bg-[#111] hover:bg-black text-white font-medium text-sm rounded-xl transition-transform active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Open Paywall Modal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* The Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSelectPlan={async (plan) => {
          console.log("Selected plan:", plan);
          await new Promise((r) => setTimeout(r, 600));
        }}
      />
    </div>
  );
}
