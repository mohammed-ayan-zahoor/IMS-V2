"use client";

import { Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmptyState({
    title = "No records found",
    description = "There are no items to display in this view.",
    icon: Icon,
    actionLabel,
    onAction,
    actionIcon: ActionIcon = Plus,
    actionVariant = "filled",
    secondaryActionLabel,
    onSecondaryAction,
    suggestions = [],
    onSuggestionClick,
    previewChips = [],
    className
}) {
    return (
        <div className={cn("mx-auto flex max-w-md flex-col items-center pt-20 pb-16 text-center", className)}>
            {/* Optional Ghost Content Preview */}
            {previewChips.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-6 opacity-40 select-none pointer-events-none">
                    {previewChips.map((chip, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                            <Tag size={11} className="text-slate-400" />
                            <span>{chip}</span>
                        </span>
                    ))}
                </div>
            ) : Icon ? (
                /* Bare Glyph without any boxed container */
                <Icon size={38} strokeWidth={1.5} className="text-slate-300 mb-3" />
            ) : null}

            {/* Title */}
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                {title}
            </h2>

            {/* Description */}
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>

            {/* Actions: Primary / Outline + Optional Secondary Link */}
            {(actionLabel || secondaryActionLabel) && (
                <div className="mt-6 flex flex-col items-center gap-3">
                    {actionLabel && (
                        actionVariant === "outline" ? (
                            <button
                                type="button"
                                onClick={onAction}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                            >
                                {ActionIcon && <ActionIcon size={15} />}
                                <span>{actionLabel}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onAction}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                            >
                                {ActionIcon && <ActionIcon size={16} />}
                                <span>{actionLabel}</span>
                            </button>
                        )
                    )}

                    {secondaryActionLabel && (
                        <button
                            type="button"
                            onClick={onSecondaryAction}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                </div>
            )}

            {/* Quick-Start Suggestions */}
            {suggestions.length > 0 && (
                <div className="mt-8">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Quick add
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => onSuggestionClick?.(s)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 active:scale-[0.97] transition-all cursor-pointer shadow-2xs group"
                            >
                                <Plus size={12} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                <span>{s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
