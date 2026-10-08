"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
    {
        id: "online-test",
        image: "/illustrations/online-test.svg",
        title: <>Online Assessments & <br />Real-time Evaluation.</>,
        description: <>Effortlessly create, assign, and grade digital tests <br />with automated instant results.</>
    },
    {
        id: "exams",
        image: "/illustrations/exams.svg",
        title: <>Smart Exam Scheduling & <br />Logistics Control.</>,
        description: <>Manage examination timetables, halls, and <br />grading schemes in one unified platform.</>
    },
    {
        id: "teaching",
        image: "/illustrations/teaching.svg",
        title: <>Interactive Classroom & <br />Faculty Tools.</>,
        description: <>Equip educators with attendance tracking, <br />curriculum management, and insights.</>
    },
    {
        id: "college-class",
        image: "/illustrations/college-class.svg",
        title: <>Connected Campus & <br />Student Lifecycle.</>,
        description: <>From admissions to graduation, monitor complete <br />student growth and academic milestones.</>
    },
    {
        id: "dashboard",
        image: "/quantech/hero_illustration.png",
        title: <>Seamless Academic <br />Management Experience.</>,
        description: <>Everything you need in an easily customizable, <br />intelligent institution dashboard.</>
    }
];

import { AuthBrandingProvider, useAuthBranding } from "@/components/auth/AuthBrandingContext";

function AuthBrandingHeader() {
    const { institute } = useAuthBranding();

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 flex flex-col items-center justify-center w-full"
        >
            <div className="flex items-center justify-center gap-5 md:gap-8 py-2 flex-wrap">
                {/* Left: Quantech Platform Logo */}
                <div className="flex flex-col items-center group relative">
                    <Image
                        src="/quantech/quantech_logo_navy.png"
                        alt="Quantech Logo"
                        width={96}
                        height={88}
                        priority
                        className="h-16 md:h-20 lg:h-22 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="flex items-center gap-1.5 mt-2 opacity-50 hover:opacity-75 transition-opacity">
                        <Image 
                            src="/quantech/ims_legacy_logo.png"
                            alt="IMS Logo"
                            width={13}
                            height={13}
                            className="grayscale"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Previously IMS
                        </span>
                    </div>
                </div>

                {/* Right: Dynamic Institution Branding (Side-by-Side) */}
                <AnimatePresence mode="wait">
                    {institute && (
                        <motion.div
                            key={institute.code || institute.name}
                            initial={{ opacity: 0, scale: 0.92, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.92, x: -10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 26 }}
                            className="flex items-center gap-5 md:gap-8"
                        >
                            {/* Subtle Vertical Divider */}
                            <div className="h-14 md:h-18 w-[1.5px] bg-slate-200/90 rounded-full shrink-0" />

                            {/* School Crest / Logo */}
                            {institute.logo ? (
                                <img
                                    src={institute.logo}
                                    alt={institute.name}
                                    className="h-18 md:h-22 lg:h-24 w-auto max-w-[200px] md:max-w-[260px] object-contain drop-shadow-sm"
                                />
                            ) : (
                                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/80 text-blue-600 font-black text-2xl md:text-3xl flex items-center justify-center border border-blue-100/90 shadow-sm">
                                    {institute.name.charAt(0)}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function AuthLayout({ children }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 5500);
        return () => clearInterval(timer);
    }, [isPaused]);

    const activeSlide = SLIDES[currentSlide];

    return (
        <AuthBrandingProvider>
            <div className="min-h-screen w-full flex bg-[#fafbfc] font-sans overflow-hidden">
                
                {/* Left Column: The Login Terminal */}
                <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-10 md:p-14 relative z-10 overflow-y-auto max-h-screen bg-white shadow-[1px_0_12px_rgba(0,0,0,0.03)]">
                    <div className="w-full max-w-md flex flex-col items-center">
                        <AuthBrandingHeader />

                        <div className="w-full">
                            {children}
                        </div>

                        <div className="mt-10 text-slate-400 text-[10px] font-semibold uppercase tracking-[0.25em] pointer-events-none text-center">
                            Enterprise Gateway • v3.0 • Secure
                        </div>
                    </div>
                </div>

                {/* Right Column: The Product Story Carousel (Desktop Only) */}
                <div 
                    className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-slate-50 via-slate-50/80 to-blue-50/30 border-l border-slate-100/80 overflow-hidden items-center justify-center p-10 lg:p-14 select-none"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* Ambient subtle glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-xl w-full">
                        {/* Illustration Stage */}
                        <div className="relative w-full h-[380px] lg:h-[430px] flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSlide.id}
                                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -16, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    <img
                                        src={activeSlide.image}
                                        alt="Product Feature Illustration"
                                        className="max-h-[380px] lg:max-h-[430px] max-w-[500px] w-full h-full object-contain pointer-events-none drop-shadow-sm"
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Captions Stage */}
                        <div className="min-h-[110px] flex flex-col justify-start">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSlide.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="space-y-3"
                                >
                                    <h2 className="text-3xl lg:text-[34px] font-black text-slate-900 leading-[1.2] tracking-tight">
                                        {activeSlide.title}
                                    </h2>
                                    <p className="text-slate-500 text-base font-normal leading-relaxed tracking-[-0.01em]">
                                        {activeSlide.description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Carousel Navigation Indicators */}
                        <div className="flex items-center gap-2 pt-2">
                            {SLIDES.map((slide, idx) => {
                                const isActive = idx === currentSlide;
                                return (
                                    <button
                                        key={slide.id}
                                        type="button"
                                        onClick={() => setCurrentSlide(idx)}
                                        aria-label={`Go to slide ${idx + 1}`}
                                        className={`h-2 rounded-full transition-all duration-300 ease-out cursor-pointer ${
                                            isActive
                                                ? "w-8 bg-slate-900 shadow-sm"
                                                : "w-2 bg-slate-300 hover:bg-slate-400"
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </AuthBrandingProvider>
    );
}
