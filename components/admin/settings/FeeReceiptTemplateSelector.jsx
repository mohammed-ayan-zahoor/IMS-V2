"use client";

import { useCallback } from "react";
import ReceiptTemplateOption from "./ReceiptTemplateOption";

const DEFAULT_OPTIONS = [
    {
        id: "classic",
        title: "Classic Full-Page Receipt",
        description: "Full A4 size layout showing itemized fee breakdown, logo, and terms.",
        type: "a4"
    },
    {
        id: "compact",
        title: "Compact Slip-Style Receipt",
        description: "Compact half-page receipt slip designed for quick printing and paper saving.",
        type: "slip"
    }
];

export default function FeeReceiptTemplateSelector({
    options = DEFAULT_OPTIONS,
    value = "classic",
    onChange
}) {
    const handleKeyDown = useCallback(
        (e) => {
            const currentIndex = options.findIndex((opt) => opt.id === value);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                nextIndex = (currentIndex + 1) % options.length;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                nextIndex = (currentIndex - 1 + options.length) % options.length;
            }

            if (nextIndex !== currentIndex && onChange) {
                onChange(options[nextIndex].id);
            }
        },
        [options, value, onChange]
    );

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-semibold text-slate-900">
                    Fee Receipt Layout
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    Choose the default receipt format used when issuing fee receipts.
                </p>
            </div>

            <div
                role="radiogroup"
                aria-label="Fee receipt template selection"
                onKeyDown={handleKeyDown}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                {options.map((option) => (
                    <ReceiptTemplateOption
                        key={option.id}
                        id={option.id}
                        title={option.title}
                        description={option.description}
                        type={option.type}
                        selected={value === option.id}
                        onSelect={(id) => onChange && onChange(id)}
                    />
                ))}
            </div>
        </div>
    );
}
