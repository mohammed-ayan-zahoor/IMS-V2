export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-academic">
            {/* Subtle light accents */}
            <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-premium-blue/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-premium-purple/5 rounded-full blur-[80px]" />

            <div className="w-full max-w-md relative z-10">
                {children}
            </div>

            {/* Footer decoration */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] pointer-events-none opacity-40">
                Institutional Management System • v2.0
            </div>
        </div>
    );
}
