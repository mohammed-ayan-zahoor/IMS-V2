"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SPRING_SMOOTH } from "./tokens";

export function ActionBar({
  dirtyCount = 0,
  state = "idle", // 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  errorMessage = "Couldn't save changes",
  className = "",
}) {
  const isVisible = state !== "idle" && (dirtyCount > 0 || state === "saving" || state === "saved" || state === "error");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={SPRING_SMOOTH}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto min-w-[340px] px-4 py-2.5 rounded-xl bg-[#111827] text-white shadow-2xl border border-slate-800 flex items-center justify-between gap-4 ${className}`}
        >
          {/* Status Text */}
          <div className="flex items-center gap-2 min-w-0">
            {state === "saving" ? (
              <span className="flex items-center gap-2 text-[12px] font-medium text-slate-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
                Saving changes…
              </span>
            ) : state === "saved" ? (
              <span className="flex items-center gap-2 text-[12px] font-semibold text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                Saved successfully
              </span>
            ) : state === "error" ? (
              <span className="flex items-center gap-2 text-[12px] font-semibold text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                {errorMessage}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span className="text-[12px] font-semibold text-white">
                  {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {state !== "saving" && state !== "saved" && onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[12px] font-medium text-white transition-colors cursor-pointer active:scale-95"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={state === "saving"}
              className="h-7 px-3.5 rounded-lg bg-[#4F46E5] hover:bg-indigo-600 text-white text-[12px] font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {state === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
              {state === "error" ? "Retry" : saveLabel}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
