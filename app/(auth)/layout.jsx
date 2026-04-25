"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
            
            {/* Left Column: The Login Terminal */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 md:p-16 relative z-10">
                <div className="w-full max-w-sm flex flex-col items-center">
                    <div className="mb-12 flex flex-col items-center group relative">
                        <Image
                            src="/quantech/Quantech-Logo.png"
                            alt="Quantech Logo"
                            width={220}
                            height={60}
                            className="scale-[1.3] md:scale-[1.5] h-auto w-auto object-contain"
                        />
                        {/* Heritage Label: Previously IMS */}
                        <div className="flex items-center gap-2 mt-2 opacity-30">
                            <Image 
                                src="/quantech/ims_legacy_logo.png"
                                alt="IMS Logo"
                                width={12}
                                height={12}
                                className="grayscale"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Previously IMS
                            </span>
                        </div>
                    </div>

                    <div className="w-full">
                        {children}
                    </div>

                    <div className="mt-12 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none text-center">
                        Enterprise Gateway • v3.0 • Secure
                    </div>
                </div>
            </div>

            {/* Right Column: The Product Story (Desktop Only) */}
            <div className="hidden lg:flex lg:w-[55%] relative bg-slate-50 border-l border-slate-100 overflow-hidden items-center justify-center p-20">
                {/* Flat, High-Key Backdrop */}
                <div className="absolute inset-0 bg-[#f8fafc]" />
                
                <div className="relative z-10 flex flex-col items-center gap-12 text-center max-w-lg">
                    <div className="relative">
                        <Image
                            src="/quantech/hero_illustration.png"
                            alt="Product Story"
                            width={500}
                            height={500}
                            className="w-full h-auto"
                        />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
                            Seamless academic <br />
                            management experience.
                        </h2>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed">
                            Everything you need in an easily <br />
                            customizable dashboard.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === 1 ? 'w-8 bg-slate-200' : 'w-2 bg-slate-100'}`} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
