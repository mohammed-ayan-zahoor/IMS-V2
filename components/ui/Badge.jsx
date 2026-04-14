import { cn } from "@/lib/utils";

export default function Badge({ className, children, variant = "neutral" }) {
    const variants = {
        neutral: "bg-slate-100 text-slate-600 border-transparent",
        primary: "bg-blue-50 text-blue-600 border-transparent",
        secondary: "bg-purple-50 text-purple-600 border-transparent",
        success: "status-success border-transparent",
        warning: "status-warning border-transparent",
        danger: "status-error border-transparent",
        hot: "status-hot border-transparent",
        code: "bg-slate-100 text-slate-500 font-mono border-slate-200/50",
    };

    const isHot = variant === "hot";

    return (
        <span
            role="status"
            className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight border",
                variants[variant] || variants.neutral,
                className
            )}
        >
            {isHot && <span className="mr-1">🔥</span>}
            {children}
        </span>
    );
}
