export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-premium-dark">
            {/* Dynamic background accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-premium-blue/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-premium-purple/20 rounded-full blur-[120px] animate-pulse" />

            <div className="w-full max-w-md relative z-10">
                {children}
            </div>
        </div>
    );
}
