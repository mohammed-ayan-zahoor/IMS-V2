import { cn } from "@/lib/utils";

export default function Button({
    className,
    variant = "primary",
    size = "md",
    fullWidth = false,
    children,
    ...props
}) {
    const variants = {
        primary: "bg-[#111827] text-white hover:opacity-90 shadow-sm",
        secondary: "bg-premium-blue text-white hover:bg-blue-600 shadow-sm",
        outline: "border border-slate-200 hover:bg-slate-50 text-slate-700",
        ghost: "hover:bg-slate-50 text-slate-600",
        danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm",
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
            className={cn(
                "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                fullWidth && "w-full",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {children}
        </button>
    );
}

