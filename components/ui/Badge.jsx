import { cn } from "@/lib/utils";

export default function Badge({ className, children, variant = "neutral" }) {
    const variants = {
        neutral: "bg-white/5 text-foreground/70 border-glass-border",
        primary: "bg-premium-blue/10 text-premium-blue border-premium-blue/20",
        secondary: "bg-premium-purple/10 text-premium-purple border-premium-purple/20",
        success: "bg-green-500/10 text-green-500 border-green-500/20",
        warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        danger: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
        <span
            role="status"
            className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm",
                variants[variant] || variants.neutral,
                className
            )}
        >
            {children}
        </span>
    );
}
