import { cn } from "@/lib/utils";

export default function SectionHeader({
    title,
    description,
    action,
    className
}) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
            <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
                {description && (
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                )}
            </div>
            {action && (
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {action}
                </div>
            )}
        </div>
    );
}
