"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f8fafc] font-sans transition-colors duration-500">
            
            {/* Optimized Background Layer: Reduced real-time blur for performance */}
            <div className="absolute inset-0 z-0 will-change-transform">
                <Image
                    src="/eduvanta/dashboard_bg.png"
                    alt="Dashboard Background"
                    fill
                    priority
                    className="object-cover opacity-[0.25] blur-xl scale-105"
                />
                {/* Soft Airy Overlay (Static) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/70 to-transparent" />
                <div className="absolute inset-0 bg-blue-500/[0.03] mix-blend-multiply" />
            </div>

            {/* Performance-Optimized Glows (Simpler Animations) */}
            <motion.div 
                animate={{ 
                    opacity: [0.05, 0.1, 0.05]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none z-0 will-change-[opacity]" 
            />
            <motion.div 
                animate={{ 
                    opacity: [0.03, 0.08, 0.03]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[20%] -right-[10%] w-[800px] h-[800px] bg-cyan-400/20 rounded-full blur-[120px] pointer-events-none z-0 will-change-[opacity]" 
            />

            <div className="w-full max-w-md relative z-10 px-4 md:px-6 py-2 md:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center gap-2 md:gap-10"
                >
                    {/* High-Impact Brand Mark with compensated ghost-padding */}
                    <div className="flex flex-col items-center w-full -my-6 md:-my-10 overflow-visible relative">
                        <div className="flex flex-col items-center relative group">
                            <Image
                                src="/eduvanta/Eduvanta-Logo.png"
                                alt="Eduvanta Logo"
                                width={220}
                                height={60}
                                className="scale-110 md:scale-[1.3] drop-shadow-sm h-auto w-auto object-contain relative z-10"
                            />
                            
                            {/* Optimized Heritage Label */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                                className="absolute left-1/2 -translate-x-1/2 bottom-[25%] md:bottom-[20%] translate-y-full z-20 flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shadow-sm whitespace-nowrap will-change-transform"
                            >
                                <Image 
                                    src="/eduvanta/ims_legacy_logo.png"
                                    alt="IMS Logo"
                                    width={12}
                                    height={12}
                                    className="opacity-70"
                                />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] text-blue-600/70">
                                    Previously IMS
                                </span>
                            </motion.div>
                        </div>
                    </div>

                    {/* The Auth Area */}
                    <div className="w-full">
                        {children}
                    </div>

                    {/* Footer decoration */}
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none whitespace-nowrap opacity-60">
                        Enterprise Access • v3.0 • Eduvanta
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
