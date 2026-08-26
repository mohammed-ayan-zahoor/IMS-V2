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
    const { institute, clearInstitute } = useAuthBranding();

    return (
        <div className="mb-10 flex flex-col items-center min-h-[70px] justify-center">
            <AnimatePresence mode="wait">
                {institute ? (
                    <motion.div
                        key={institute.code || institute.name}
                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        <div className="flex items-center justify-center gap-3 md:gap-4">
                            {/* Platform Logo */}
                            <Image
                                src="/quantech/Quantech-Logo.png"
                                alt="Quantech Logo"
                                width={130}
                                height={35}
                                priority
                                className="h-8 md:h-9 w-auto object-contain"
                            />

                            {/* Divider */}
                            <div className="h-6 md:h-7 w-[1.5px] bg-slate-200" />

                            {/* School Logo & Name */}
                            <div className="flex items-center gap-2.5 max-w-[220px]">
                                {institute.logo ? (
                                    <img
                                        src={institute.logo}
                                        alt={institute.name}
                                        className="h-8 w-8 md:h-9 md:w-9 rounded-lg object-contain border border-slate-100 shadow-sm shrink-0 bg-white p-0.5"
                                    />
                                ) : (
                                    <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm md:text-base shrink-0 shadow-sm">
                                        {institute.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex flex-col text-left overflow-hidden">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs md:text-sm font-black text-slate-900 leading-tight truncate">
                                            {institute.name}
                                        </span>
                                        {institute.totalInstitutes > 1 && (
                                            <span className="text-[9px] font-extrabold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100/80 shrink-0">
                                                +{institute.totalInstitutes - 1}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {institute.type === 'SCHOOL' ? 'School Portal' : 'Academy Portal'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Reset / Switch button */}
                        <button
                            type="button"
                            onClick={clearInstitute}
                            className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mt-2 tracking-wide"
                        >
                            Not your institution? <span className="underline text-blue-600 font-bold">Switch</span>
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="default-logo"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center group relative"
                    >
                        <Image
                            src="/quantech/Quantech-Logo.png"
                            alt="Quantech Logo"
                            width={220}
                            height={60}
                            priority
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
            <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
                
                {/* Left Column: The Login Terminal */}
                <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 md:p-16 relative z-10">
                    <div className="w-full max-w-sm flex flex-col items-center">
                        <AuthBrandingHeader />

                        <div className="w-full">
                            {children}
                        </div>

                        <div className="mt-12 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none text-center">
                            Enterprise Gateway • v3.0 • Secure
                        </div>
                    </div>
                </div>

            {/* Right Column: The Product Story Carousel (Desktop Only) */}
            <div 
                className="hidden lg:flex lg:w-[55%] relative bg-slate-50 border-l border-slate-100 overflow-hidden items-center justify-center p-8 lg:p-12 select-none"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Flat, High-Key Backdrop */}
                <div className="absolute inset-0 bg-[#f8fafc]" />
                
                <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-xl w-full">
                    {/* Illustration Stage */}
                    <div className="relative w-full h-[420px] lg:h-[450px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSlide.id}
                                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <img
                                    src={activeSlide.image}
                                    alt="Product Feature Illustration"
                                    className="max-h-[420px] max-w-[520px] w-full h-full object-contain pointer-events-none"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Captions Stage */}
                    <div className="min-h-[110px] flex flex-col justify-start">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSlide.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className="space-y-3"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                                    {activeSlide.title}
                                </h2>
                                <p className="text-slate-500 text-base lg:text-lg font-medium leading-relaxed">
                                    {activeSlide.description}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Carousel Navigation Indicators (5 Dots) */}
                    <div className="flex items-center gap-2.5 pt-2">
                        {SLIDES.map((slide, idx) => {
                            const isActive = idx === currentSlide;
                            return (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => setCurrentSlide(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        isActive
                                            ? "w-9 bg-slate-900"
                                            : "w-2.5 bg-slate-200 hover:bg-slate-300"
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
