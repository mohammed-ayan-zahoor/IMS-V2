import { LucideIcon, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function EmptyState({
    title = "No records found",
    description = "There are no items to display in this view.",
    icon: Icon = Trash2,
    actionLabel,
    onAction
}) {
    return (
        <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl border-dashed border-2 border-glass-border">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-foreground/20 mb-6">
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">{title}</h3>
            <p className="text-sm text-foreground/50 max-w-xs text-center mb-8">
                {description}
            </p>
            {actionLabel && (
                <Button onClick={onAction} variant="outline" size="sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
