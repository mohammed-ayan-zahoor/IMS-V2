export default function LoadingSpinner({ 
    fullPage = false, 
    size = "md", 
    className = "" 
}) {
    const sizes = {
        sm: "w-4 h-4 border-2",
        md: "w-8 h-8 border-3",
        lg: "w-12 h-12 border-4",
    };

    const spinner = (
        <div className={cn("relative", sizes[size], className)}>
            <div className={cn("absolute inset-0 rounded-full", sizes[size].includes('border-2') ? 'border-2' : sizes[size].includes('border-3') ? 'border-3' : 'border-4', "border-current opacity-20")} />
            <div className={cn("absolute inset-0 rounded-full animate-spin border-t-transparent", sizes[size].includes('border-2') ? 'border-2' : sizes[size].includes('border-3') ? 'border-3' : 'border-4', "border-current")} />
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center gap-4">
                {spinner}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 animate-pulse">
                    Synchronizing...
                </p>
            </div>
        );
    }

    if (size === "sm") {
        return spinner;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 p-4">
            {spinner}
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30">
                Loading...
            </p>
        </div>
    );
}

import { cn } from "@/lib/utils";
