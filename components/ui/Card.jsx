import { cn } from "@/lib/utils";

export default function Card({ className, children, padding = "p-6", ...props }) {
    return (
        <div
            className={cn(
                "premium-card relative",
                padding,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, title, subtitle, children }) {
    return (
        <div className={cn("space-y-1 mb-6", className)}>
            {title && <h3 className="text-[17px] font-bold tracking-tight text-slate-900">{title}</h3>}
            {subtitle && <p className="text-[13px] text-slate-500 font-medium">{subtitle}</p>}
            {children}
        </div>
    );
}

export function CardContent({ className, children }) {
    return <div className={cn("", className)}>{children}</div>;
}
