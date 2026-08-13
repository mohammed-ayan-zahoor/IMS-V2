import { cn } from "@/lib/utils";

export default function Button({
    className,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    children,
    ...props
}) {
    const variants = {
        primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-none border border-slate-900",
        secondary: "bg-slate-800 text-white hover:bg-slate-700 shadow-none border border-slate-800",
        outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-none",
        ghost: "hover:bg-slate-100 text-slate-700",
        danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-none border border-rose-600",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs font-bold",
        md: "px-4 py-2 text-xs font-bold",
        lg: "px-6 py-2.5 text-sm font-bold",
    };

    return (
        <button
            {...props}
            type={props.type || "button"}
            disabled={props.disabled || loading}
            className={cn(
                "inline-flex items-center justify-center rounded-md font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none gap-2",
                fullWidth && "w-full",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {loading && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    );
}
