import { cn } from "@/lib/utils";

export default function Button({
    className,
    variant = "primary",
    size = "md",
    children,
    ...props
}) {
    const variants = {
        primary: "bg-premium-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30",
        secondary: "bg-premium-purple text-white hover:bg-purple-600 shadow-lg shadow-purple-500/30",
        outline: "border border-glass-border hover:bg-white/10 text-foreground backdrop-blur-sm",
        ghost: "hover:bg-white/10 text-foreground",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30",
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
                "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
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
