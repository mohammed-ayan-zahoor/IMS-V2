import { cn } from "@/lib/utils";

export default function LoadingSpinner({ 
    fullPage = false, 
    size = "md", 
    className = "",
    variant = "gradient",
    text = "Loading..."
}) {
    const sizes = {
        sm: "w-4 h-4",
        md: "w-8 h-8",
        lg: "w-12 h-12",
    };

    // Modern gradient spinner
    const GradientSpinner = () => (
        <div className={cn("relative", sizes[size], className)}>
            <svg className="w-full h-full animate-spin" viewBox="0 0 50 50">
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.2"
                />
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    strokeDasharray="31.4 125.6"
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );

    // Classic spinner with modern styling
    const ClassicSpinner = () => (
        <div className={cn("relative", sizes[size], className)}>
            <div className={cn("absolute inset-0 rounded-full border-2 border-current opacity-20")} />
            <div className={cn("absolute inset-0 rounded-full animate-spin border-2 border-transparent border-t-current")} />
        </div>
    );

    // Dual ring spinner
    const DualRingSpinner = () => (
        <div className={cn("relative", sizes[size], className)}>
            <div className={cn("absolute inset-0 rounded-full animate-spin border-2 border-transparent border-t-current border-r-current")} />
            <div className={cn("absolute inset-0 rounded-full animate-spin border-2 border-transparent border-b-current opacity-50", "animation-delay-200")} style={{ animationDelay: '0.2s' }} />
        </div>
    );

    // Pulsing dots
    const PulsingDots = () => (
        <div className={cn("flex items-center justify-center gap-1", sizes[size])}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                    style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1.4s'
                    }}
                />
            ))}
        </div>
    );

    const spinnerVariants = {
        gradient: <GradientSpinner />,
        classic: <ClassicSpinner />,
        dual: <DualRingSpinner />,
        dots: <PulsingDots />
    };

    const spinner = spinnerVariants[variant] || spinnerVariants.gradient;

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center gap-4">
                <div className="text-primary">
                    {spinner}
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-foreground/60 animate-pulse">
                    {text}
                </p>
            </div>
        );
    }

    if (size === "sm") {
        return <div className="text-primary">{spinner}</div>;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 p-4">
            <div className="text-primary">
                {spinner}
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
                {text}
            </p>
        </div>
    );
}
