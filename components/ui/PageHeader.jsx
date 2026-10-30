import { cn } from "@/lib/utils";

export default function PageHeader({
    title,
    description,
    actions,
    className
}) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200", className)}>
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                {description && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                    {actions}
                </div>
            )}
        </div>
    );
}
