import { cn } from "@/lib/utils";

const BookSpinner = ({ size = "md" }) => {
    const s = { sm: 32, md: 48, lg: 64 }[size] || 48;
    return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
            <style>{`
                @keyframes page1 { 0%,100%{transform-origin:left center;transform:rotateY(0deg);opacity:1} 50%{transform-origin:left center;transform:rotateY(-140deg);opacity:0.3} }
                @keyframes page2 { 0%,100%{transform-origin:left center;transform:rotateY(0deg);opacity:0.6} 50%{transform-origin:left center;transform:rotateY(-140deg);opacity:0.15} }
                @keyframes page3 { 0%,100%{transform-origin:left center;transform:rotateY(0deg);opacity:0.35} 50%{transform-origin:left center;transform:rotateY(-140deg);opacity:0.08} }
                .p1{animation:page1 1.4s ease-in-out infinite;}
                .p2{animation:page2 1.4s ease-in-out infinite 0.1s;}
                .p3{animation:page3 1.4s ease-in-out infinite 0.2s;}
            `}</style>
            <rect x="8" y="10" width="32" height="28" rx="3" fill="#e8f0fe" stroke="#4285f4" strokeWidth="1.5" />
            <line x1="24" y1="10" x2="24" y2="38" stroke="#4285f4" strokeWidth="1.5" />
            <g className="p3"><rect x="24" y="12" width="14" height="24" rx="1" fill="#93c5fd" /></g>
            <g className="p2"><rect x="24" y="12" width="14" height="24" rx="1" fill="#60a5fa" /></g>
            <g className="p1"><rect x="24" y="12" width="14" height="24" rx="1" fill="#3b82f6" /></g>
        </svg>
    );
};

const OrbitSpinner = ({ size = "md" }) => {
    const s = { sm: 32, md: 48, lg: 64 }[size] || 48;
    return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
            <style>{`
                @keyframes orbit1{from{transform:rotate(0deg) translateX(14px) rotate(0deg)}to{transform:rotate(360deg) translateX(14px) rotate(-360deg)}}
                @keyframes orbit2{from{transform:rotate(120deg) translateX(14px) rotate(-120deg)}to{transform:rotate(480deg) translateX(14px) rotate(-480deg)}}
                @keyframes orbit3{from{transform:rotate(240deg) translateX(14px) rotate(-240deg)}to{transform:rotate(600deg) translateX(14px) rotate(-600deg)}}
                @keyframes pulse{0%,100%{r:3}50%{r:4.5}}
                .o1{transform-origin:24px 24px;animation:orbit1 1.6s linear infinite;}
                .o2{transform-origin:24px 24px;animation:orbit2 1.6s linear infinite;}
                .o3{transform-origin:24px 24px;animation:orbit3 1.6s linear infinite;}
            `}</style>
            <circle cx="24" cy="24" r="4" fill="#6366f1" opacity="0.2" />
            <circle cx="24" cy="24" r="2.5" fill="#6366f1" />
            <g className="o1"><circle cx="24" cy="24" r="3.5" fill="#3b82f6" /></g>
            <g className="o2"><circle cx="24" cy="24" r="3" fill="#8b5cf6" /></g>
            <g className="o3"><circle cx="24" cy="24" r="2.5" fill="#06b6d4" /></g>
        </svg>
    );
};

const MorphSpinner = ({ size = "md" }) => {
    const s = { sm: 32, md: 48, lg: 64 }[size] || 48;
    return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
            <style>{`
                @keyframes morph{
                    0%{d:path("M24 8 L38 20 L33 36 L15 36 L10 20 Z")}
                    25%{d:path("M24 6 L40 18 L36 38 L12 38 L8 18 Z")}
                    50%{d:path("M24 10 L36 22 L30 38 L18 38 L12 22 Z")}
                    75%{d:path("M24 7 L39 19 L34 37 L14 37 L9 19 Z")}
                    100%{d:path("M24 8 L38 20 L33 36 L15 36 L10 20 Z")}
                }
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                .ms{transform-origin:24px 24px;animation:spin 2s linear infinite;}
                .mp{animation:morph 2s ease-in-out infinite;}
            `}</style>
            <g className="ms">
                <path className="mp" d="M24 8 L38 20 L33 36 L15 36 L10 20 Z" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
                <path className="mp" d="M24 8 L38 20 L33 36 L15 36 L10 20 Z" fill="#fef3c7" opacity="0.5" />
            </g>
            <circle cx="24" cy="24" r="4" fill="#f59e0b" />
        </svg>
    );
};

const GridSpinner = ({ size = "md" }) => {
    const s = { sm: 32, md: 48, lg: 64 }[size] || 48;
    const dots = [
        [10, 10], [24, 10], [38, 10],
        [10, 24], [24, 24], [38, 24],
        [10, 38], [24, 38], [38, 38],
    ];
    return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
            <style>{`
                @keyframes dotpop{0%,100%{r:3;opacity:0.15}50%{r:5;opacity:1}}
                ${dots.map(([,], i) => `.d${i}{animation:dotpop 1.2s ease-in-out infinite;animation-delay:${(i * 0.1).toFixed(1)}s;}`).join('')}
            `}</style>
            {dots.map(([cx, cy], i) => (
                <circle key={i} className={`d${i}`} cx={cx} cy={cy} r="3" fill="#10b981" />
            ))}
        </svg>
    );
};

const WaveSpinner = ({ size = "md" }) => {
    const s = { sm: 32, md: 48, lg: 64 }[size] || 48;
    const bars = [4, 10, 16, 22, 28, 34, 40];
    return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
            <style>{`
                @keyframes wave{0%,100%{height:6px;y:21px;opacity:0.3}50%{height:28px;y:10px;opacity:1}}
                ${bars.map((_, i) => `.w${i}{animation:wave 1s ease-in-out infinite;animation-delay:${(i * 0.1).toFixed(1)}s;}`).join('')}
            `}</style>
            {bars.map((x, i) => (
                <rect key={i} className={`w${i}`} x={x} y="21" width="4" height="6" rx="2"
                    fill={`hsl(${200 + i * 15}, 80%, 55%)`} />
            ))}
        </svg>
    );
};

export default function LoadingSpinner({
    fullPage = false,
    size = "md",
    className = "",
    variant = "orbit",
    text = "Loading...",
}) {
    const spinnerMap = {
        orbit: <OrbitSpinner size={size} />,
        book: <BookSpinner size={size} />,
        morph: <MorphSpinner size={size} />,
        grid: <GridSpinner size={size} />,
        wave: <WaveSpinner size={size} />,
    };

    const spinner = spinnerMap[variant] || spinnerMap.orbit;

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center gap-4">
                {spinner}
                <p className="text-sm font-semibold uppercase tracking-widest text-foreground/60 animate-pulse">
                    {text}
                </p>
            </div>
        );
    }

    if (size === "sm") {
        return <div className={cn(className)}>{spinner}</div>;
    }

    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 p-4", className)}>
            {spinner}
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
                {text}
            </p>
        </div>
    );
}