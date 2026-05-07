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
        primary: "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]",
        secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_4px_14px_0_rgba(15,23,42,0.39)]",
        outline: "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:shadow-sm",
        ghost: "hover:bg-slate-50 text-slate-600",
        danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_14px_0_rgba(244,63,94,0.39)]",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-[13px]",
        lg: "px-8 py-3.5 text-base",
    };

    return (
        <button
            {...props}
            type={props.type || "button"}
            disabled={props.disabled || loading}
            className={cn(
                "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2",
                fullWidth && "w-full",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    );
}

