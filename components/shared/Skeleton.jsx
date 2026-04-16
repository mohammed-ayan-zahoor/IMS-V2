import { cn } from "@/lib/utils";

export default function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-xl bg-slate-200/60 shadow-inner",
                className
            )}
            {...props}
        />
    );
}

export function SkeletonCard({ className }) {
    return (
        <div className={cn("p-6 bg-white rounded-3xl border border-slate-100 space-y-4", className)}>
            <div className="flex justify-between">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="w-3/4 h-8" />
                <Skeleton className="w-full h-4" />
            </div>
            <div className="pt-4 flex justify-between">
                <Skeleton className="w-1/3 h-10 rounded-xl" />
                <Skeleton className="w-1/3 h-10 rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonBanner() {
    return (
        <div className="w-full h-48 rounded-3xl bg-slate-100 overflow-hidden relative">
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
            <div className="absolute bottom-6 left-6 space-y-3">
                <Skeleton className="w-48 h-10" />
                <Skeleton className="w-32 h-6" />
            </div>
        </div>
    );
}
