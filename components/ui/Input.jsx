import { cn } from "@/lib/utils";

export default function Input({ className, label, error, id, ...props }) {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label
                    htmlFor={id}
                    className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1"
                >
                    {label}
                </label>
            )}
            <input
                id={id}
                className={cn(
                    "w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2.5 outline-none transition-all duration-200 focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 placeholder:text-foreground/30 text-sm backdrop-blur-md",
                    error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10",
                    className
                )}
                {...props}
            />
            {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
}
