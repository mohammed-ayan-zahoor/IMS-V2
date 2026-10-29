"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SPRING_TRANSITION } from "./tokens";

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
          transition={SPRING_TRANSITION}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-2rem)] sm:w-auto min-w-[340px] px-5 py-3 rounded-[12px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-[#E9E9F1] dark:border-gray-800 shadow-[0_-8px_24px_rgba(16,19,35,0.08)] flex items-center justify-between gap-4 ${className}`}
        >
          {/* Status Text */}
          <div className="flex items-center gap-2 min-w-0">
            {state === "saving" ? (
              <span className="flex items-center gap-2 text-xs font-medium text-[#101323] dark:text-gray-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
                Saving changes…
              </span>
            ) : state === "saved" ? (
              <span className="flex items-center gap-2 text-xs font-semibold text-[#047857] dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                Saved successfully
              </span>
            ) : state === "error" ? (
              <span className="flex items-center gap-2 text-xs font-semibold text-[#B42318] dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 text-[#B42318]" />
                {errorMessage}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
                <span className="text-xs font-semibold text-[#101323] dark:text-gray-100">
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
                className="h-8 px-3 rounded-[8px] border border-[#8E93A8]/40 dark:border-gray-700 text-xs font-medium text-[#101323] dark:text-gray-200 hover:bg-[#F1F1F8] dark:hover:bg-gray-800 transition-colors cursor-pointer active:scale-97"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={state === "saving"}
              className="h-8 px-4 rounded-[8px] bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-97"
            >
              {state === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {state === "error" ? "Retry" : saveLabel}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
