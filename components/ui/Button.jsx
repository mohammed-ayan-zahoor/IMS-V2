import { cn } from "@/lib/utils";

export default function Button({
    className,
    variant = "primary",
    size = "md",
    children,
    ...props
}) {
    const variants = {
        primary: "bg-premium-blue text-white hover:bg-blue-600 shadow-sm",
        secondary: "bg-premium-purple text-white hover:bg-purple-600 shadow-sm",
        outline: "border border-border hover:bg-slate-50 text-foreground",
        ghost: "hover:bg-slate-50 text-foreground",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            type={props.type || "button"}
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
