import { cn } from "@/lib/utils";

export default function Card({ className, children, ...props }) {
    return (
        <div
            className={cn(
                "glass rounded-2xl p-6 relative",
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
        <div className={cn("space-y-1.5 mb-6", className)}>
            {title && <h3 className="text-xl font-bold tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}
            {children}
        </div>
    );
}

export function CardContent({ className, children }) {
    return <div className={cn("", className)}>{children}</div>;
}
