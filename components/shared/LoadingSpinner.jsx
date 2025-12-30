export default function LoadingSpinner({ fullPage = false }) {
    const content = (
        <div
            className="flex flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
            aria-label="Loading data"
        >
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-premium-blue/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-premium-blue border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 animate-pulse">
                Synchronizing Data...
            </p>
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center">
                {content}
            </div>
        );
    }

    return <div className="p-12 w-full flex justify-center">{content}</div>;
}
