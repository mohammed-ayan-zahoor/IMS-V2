"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from 'lucide-react';
import MediaPicker from '../widgets/MediaPicker';
import { motion } from 'framer-motion';

const HeroSection = ({ content = {}, isEditing = false, onUpdate, preset = 'modern' }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const {
        title = "Welcome to Our Institute",
        subtitle = "Empowering students through quality education and professional training.",
        backgroundImage = "https://images.unsplash.com/photo-1523050853064-59f602992d42?q=80&w=2000",
        ctaText = "Explore Programs",
        ctaLink = "#",
        alignment = "center", // left, center, right
        layout = "centered" // centered, split, banner
    } = content;

    // Preset Styles
    const getPresetStyles = () => {
        switch (preset) {
            case 'classic':
                return {
                    sectionBg: "bg-[#FCFBF7]",
                    overlay: "absolute inset-0 bg-slate-900/65",
                    titleClass: "text-4xl md:text-5xl font-serif font-bold italic tracking-normal text-white",
                    splitTitleClass: "text-4xl md:text-5xl font-serif font-bold italic tracking-normal text-slate-900",
                    subtitleClass: "text-lg md:text-xl text-slate-200 font-serif leading-relaxed",
                    splitSubtitleClass: "text-lg md:text-xl text-slate-600 font-serif leading-relaxed",
                    buttonClass: "inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold tracking-wide uppercase transition-all duration-300 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/95"
                };
            case 'bold':
                return {
                    sectionBg: "bg-[var(--color-secondary)]/5 border-b-4 border-slate-950",
                    overlay: "absolute inset-0 bg-gradient-to-tr from-black/85 via-black/55 to-[var(--color-primary)]/40",
                    titleClass: "text-5xl md:text-7xl font-black uppercase tracking-tight text-white",
                    splitTitleClass: "text-4xl md:text-6xl font-black uppercase tracking-tight text-slate-950",
                    subtitleClass: "text-xl md:text-2xl text-slate-100 font-bold",
                    splitSubtitleClass: "text-lg md:text-xl text-slate-700 font-bold",
                    buttonClass: "inline-flex items-center justify-center px-8 py-4 text-base font-black uppercase tracking-wider text-black bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
                };
            case 'minimal':
                return {
                    sectionBg: "bg-white border-b border-slate-100",
                    overlay: "absolute inset-0 bg-black/65 backdrop-grayscale",
                    titleClass: "text-4xl md:text-5xl font-light tracking-tight text-white",
                    splitTitleClass: "text-4xl md:text-5xl font-light tracking-tight text-slate-900",
                    subtitleClass: "text-base md:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl",
                    splitSubtitleClass: "text-sm md:text-base text-slate-500 font-normal leading-relaxed",
                    buttonClass: "inline-flex items-center justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-white border border-slate-950 bg-slate-950 hover:bg-white hover:text-black transition-all duration-300 rounded-none"
                };
            case 'dark':
                return {
                    sectionBg: "bg-slate-950",
                    overlay: "absolute inset-0 bg-slate-950/80 shadow-inner",
                    titleClass: "text-5xl md:text-6xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[var(--color-primary)]",
                    splitTitleClass: "text-4xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[var(--color-primary)]",
                    subtitleClass: "text-lg md:text-xl text-emerald-100/70 font-mono",
                    splitSubtitleClass: "text-base md:text-lg text-slate-400 font-mono",
                    buttonClass: "inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold uppercase text-white rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
                };
            case 'modern':
            default:
                return {
                    sectionBg: "bg-slate-50",
                    overlay: "absolute inset-0 bg-black/50 backdrop-blur-[1px]",
                    titleClass: "text-4xl md:text-6xl font-extrabold tracking-tight text-white",
                    splitTitleClass: "text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900",
                    subtitleClass: "text-lg md:text-xl text-slate-200 font-medium",
                    splitSubtitleClass: "text-base md:text-lg text-slate-600 font-medium",
                    buttonClass: "inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/25 hover:shadow-[var(--color-primary)]/40 bg-[var(--color-primary)]"
                };
        }
    };

    const styles = getPresetStyles();

    // Image Picker Render helper
    const renderImagePickerButton = () => {
        if (!isEditing) return null;
        return (
            <div className="absolute top-4 left-4 z-50">
                <button 
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white rounded-xl border border-white/20 hover:bg-slate-800 transition-all font-bold text-sm shadow-md"
                >
                    <ImageIcon size={16} />
                    Change Image
                </button>
            </div>
        );
    };

    const renderMediaPicker = () => {
        if (!showPicker) return null;
        return (
            <MediaPicker 
                currentUrl={backgroundImage}
                onSelect={(url) => {
                    onUpdate({ backgroundImage: url });
                    setShowPicker(false);
                }}
                onClose={() => setShowPicker(false)}
            />
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: SPLIT
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "split") {
        return (
            <section className={cn("relative min-h-[75vh] flex items-center overflow-hidden py-16 md:py-24", styles.sectionBg)}>
                {renderImagePickerButton()}
                {renderMediaPicker()}
                
                <div className="container px-6 mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                        <div className="md:col-span-6 space-y-8 text-left">
                            <motion.h1 
                                initial={{ opacity: 0, x: -25 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={styles.splitTitleClass}
                            >
                                {isEditing ? (
                                    <input 
                                        className="bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none w-full text-left font-inherit"
                                        value={title}
                                        onChange={(e) => onUpdate({ title: e.target.value })}
                                    />
                                ) : title}
                            </motion.h1>
                            
                            <motion.p 
                                initial={{ opacity: 0, x: -25 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                                className={styles.splitSubtitleClass}
                            >
                                {isEditing ? (
                                    <textarea 
                                        className="bg-transparent border border-slate-200 rounded p-2 w-full h-24 focus:border-blue-500 outline-none text-left font-inherit"
                                        value={subtitle}
                                        onChange={(e) => onUpdate({ subtitle: e.target.value })}
                                    />
                                ) : subtitle}
                            </motion.p>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                            >
                                {isEditing ? (
                                    <div className="inline-block bg-slate-100 p-2 rounded-xl border border-slate-200">
                                        <input 
                                            className="bg-transparent text-slate-800 border-b border-slate-300 focus:border-blue-500 outline-none w-32 px-2 py-1 text-center font-bold"
                                            value={ctaText}
                                            onChange={(e) => onUpdate({ ctaText: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <a 
                                        href={ctaLink}
                                        className={styles.buttonClass}
                                        style={preset !== 'bold' && preset !== 'minimal' ? { backgroundColor: 'var(--color-primary)' } : {}}
                                    >
                                        {ctaText}
                                    </a>
                                )}
                            </motion.div>
                        </div>
                        
                        <div className="md:col-span-6 relative h-[450px] w-full">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                className="w-full h-full rounded-[36px] overflow-hidden shadow-2xl relative"
                            >
                                <img 
                                    src={backgroundImage} 
                                    alt="Hero illustration"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: BANNER (Compact Header Banner)
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "banner") {
        return (
            <section className={cn("relative min-h-[40vh] flex items-center overflow-hidden py-16", styles.sectionBg)}>
                {/* Abstract decorative accent backgrounds */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-[var(--color-primary)] rounded-full blur-[140px]" />
                    <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-[var(--color-secondary)] rounded-full blur-[140px]" />
                </div>
                
                <div className="container px-6 mx-auto relative z-10">
                    <div className="max-w-4xl space-y-6 text-left">
                        <motion.h1 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className={styles.splitTitleClass}
                        >
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none w-full text-left font-inherit"
                                    value={title}
                                    onChange={(e) => onUpdate({ title: e.target.value })}
                                />
                            ) : title}
                        </motion.h1>
                        
                        <motion.p 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className={styles.splitSubtitleClass}
                        >
                            {isEditing ? (
                                <textarea 
                                    className="bg-transparent border border-slate-200 rounded p-2 w-full h-20 focus:border-blue-500 outline-none text-left font-inherit"
                                    value={subtitle}
                                    onChange={(e) => onUpdate({ subtitle: e.target.value })}
                                />
                            ) : subtitle}
                        </motion.p>
                    </div>
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: CENTERED (Default full-width bg layout)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className="relative min-h-[75vh] flex items-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            >
                <div className={styles.overlay} />
            </div>

            {renderImagePickerButton()}
            {renderMediaPicker()}

            <div className="container relative z-10 px-6 py-24 mx-auto">
                <div className={cn(
                    "max-w-3xl space-y-8",
                    alignment === "center" && "mx-auto text-center",
                    alignment === "right" && "ml-auto text-right"
                )}>
                    <motion.h1 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={styles.titleClass}
                    >
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-white/30 focus:border-white outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                        className={styles.subtitleClass}
                    >
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-white/20 rounded p-2 w-full h-24 focus:border-white outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                        className="pt-4"
                    >
                        {isEditing ? (
                            <div className="inline-block bg-slate-900/60 p-2 rounded-xl border border-white/10">
                                <input 
                                    className="bg-transparent text-white border-b border-white/30 focus:border-white outline-none w-32 px-2 py-1 text-center font-bold"
                                    value={ctaText}
                                    onChange={(e) => onUpdate({ ctaText: e.target.value })}
                                />
                            </div>
                        ) : (
                            <a 
                                href={ctaLink}
                                className={styles.buttonClass}
                                style={preset !== 'bold' && preset !== 'minimal' ? { backgroundColor: 'var(--color-primary)' } : {}}
                            >
                                {ctaText}
                            </a>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
