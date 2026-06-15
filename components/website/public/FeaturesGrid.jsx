"use client";

import React from 'react';
import { BookOpen, Users, Award, ShieldCheck, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
    'book': BookOpen,
    'users': Users,
    'award': Award,
    'shield': ShieldCheck,
    'zap': Zap,
    'globe': Globe
};

const FeaturesGrid = ({ content = {}, isEditing = false, onUpdate, preset = 'modern' }) => {
    const {
        title = "Why Choose Us?",
        subtitle = "Experience excellence in education with our modern facilities and expert faculty.",
        layout = "grid", // grid, cards, list
        features = [
            { id: 1, title: "Expert Faculty", desc: "Learn from industry professionals and experienced teachers.", icon: 'users' },
            { id: 2, title: "Modern Facilities", desc: "State-of-the-art labs and classrooms for hands-on learning.", icon: 'zap' },
            { id: 3, title: "Global Recognition", desc: "Certificates and degrees recognized worldwide.", icon: 'globe' }
        ]
    } = content;

    const getPresetStyles = () => {
        switch (preset) {
            case 'classic':
                return {
                    sectionBg: "py-24 bg-[#FCFBF7]",
                    containerClass: "max-w-3xl mx-auto text-center mb-16 font-serif",
                    titleClass: "text-3xl md:text-4xl font-bold text-slate-900 font-serif",
                    subtitleClass: "mt-4 text-base md:text-lg text-slate-600 font-serif leading-relaxed",
                    cardClass: "p-8 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all duration-300",
                    iconClass: "w-12 h-12 flex items-center justify-center text-[var(--color-primary)] rounded-full border-2 border-[var(--color-primary)] mb-6 bg-transparent",
                    textTitleClass: "text-lg font-bold text-slate-900 mb-3 font-serif",
                    textDescClass: "text-slate-600 text-sm leading-relaxed font-serif"
                };
            case 'bold':
                return {
                    sectionBg: "py-24 bg-[var(--color-secondary)]/5",
                    containerClass: "max-w-3xl mx-auto text-center mb-16",
                    titleClass: "text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900",
                    subtitleClass: "mt-4 text-lg text-slate-700 font-bold",
                    cardClass: "p-8 bg-white border-4 border-slate-950 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200",
                    iconClass: "w-12 h-12 flex items-center justify-center text-white bg-slate-950 rounded-none border-2 border-slate-950 mb-6",
                    textTitleClass: "text-xl font-extrabold uppercase tracking-tight text-slate-900 mb-3",
                    textDescClass: "text-slate-800 text-sm font-medium leading-relaxed"
                };
            case 'minimal':
                return {
                    sectionBg: "py-20 bg-white",
                    containerClass: "max-w-3xl mx-auto text-center mb-16",
                    titleClass: "text-3xl font-light tracking-tight text-slate-900",
                    subtitleClass: "mt-4 text-sm text-slate-500 leading-relaxed max-w-xl mx-auto",
                    cardClass: "p-6 bg-transparent border-b border-slate-100 rounded-none text-left",
                    iconClass: "text-[var(--color-primary)] w-6 h-6 mb-4",
                    textTitleClass: "text-base font-bold text-slate-900 mb-2 tracking-tight",
                    textDescClass: "text-slate-500 text-xs leading-relaxed"
                };
            case 'dark':
                return {
                    sectionBg: "py-24 bg-slate-950",
                    containerClass: "max-w-3xl mx-auto text-center mb-16",
                    titleClass: "text-3xl md:text-4xl font-extrabold tracking-wider text-white",
                    subtitleClass: "mt-4 text-base text-slate-400 font-mono",
                    cardClass: "p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300",
                    iconClass: "w-12 h-12 flex items-center justify-center text-[var(--color-primary)] bg-slate-950 border border-slate-800 rounded-xl mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
                    textTitleClass: "text-lg font-bold text-white mb-3",
                    textDescClass: "text-slate-400 text-sm leading-relaxed"
                };
            case 'modern':
            default:
                return {
                    sectionBg: "py-24 bg-slate-50/50",
                    containerClass: "max-w-3xl mx-auto text-center mb-16",
                    titleClass: "text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900",
                    subtitleClass: "mt-4 text-lg text-slate-600 font-medium",
                    cardClass: "p-8 bg-white rounded-3xl shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow duration-300",
                    iconClass: "w-12 h-12 flex items-center justify-center text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-2xl mb-6",
                    textTitleClass: "text-xl font-bold text-slate-900 mb-3",
                    textDescClass: "text-slate-600 leading-relaxed"
                };
        }
    };

    const styles = getPresetStyles();

    const renderHeader = () => (
        <div className={styles.containerClass}>
            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={styles.titleClass}
            >
                {isEditing ? (
                    <input 
                        className="bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none w-full text-center"
                        value={title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                    />
                ) : title}
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={styles.subtitleClass}
            >
                {isEditing ? (
                    <textarea 
                        className="bg-transparent border border-slate-200 rounded p-2 w-full h-20 focus:border-blue-500 outline-none text-center"
                        value={subtitle}
                        onChange={(e) => onUpdate({ subtitle: e.target.value })}
                    />
                ) : subtitle}
            </motion.p>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: ALTERNATING LIST
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "list") {
        return (
            <section className={styles.sectionBg}>
                <div className="container px-6 mx-auto">
                    {renderHeader()}
                    
                    <div className="max-w-4xl mx-auto space-y-16">
                        {features.map((feature, index) => {
                            const IconComponent = iconMap[feature.icon] || BookOpen;
                            const isEven = index % 2 === 0;
                            return (
                                <motion.div 
                                    key={feature.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                        "flex flex-col gap-8 items-center",
                                        isEven ? "md:flex-row" : "md:flex-row-reverse"
                                    )}
                                >
                                    <div className="w-24 h-24 shrink-0 flex items-center justify-center rounded-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                        <IconComponent size={40} />
                                    </div>
                                    
                                    <div className="flex-1 text-center md:text-left space-y-3">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-200 outline-none w-full text-center md:text-left"
                                                    value={feature.title}
                                                    onChange={(e) => {
                                                        const newFeatures = [...features];
                                                        newFeatures[index].title = e.target.value;
                                                        onUpdate({ features: newFeatures });
                                                    }}
                                                />
                                            ) : feature.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base">
                                            {isEditing ? (
                                                <textarea 
                                                    className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none text-center md:text-left"
                                                    value={feature.desc}
                                                    onChange={(e) => {
                                                        const newFeatures = [...features];
                                                        newFeatures[index].desc = e.target.value;
                                                        onUpdate({ features: newFeatures });
                                                    }}
                                                />
                                            ) : feature.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: STYLIZED CARDS (e.g. NextUI/HeroUI card layouts)
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "cards") {
        return (
            <section className={styles.sectionBg}>
                <div className="container px-6 mx-auto">
                    {renderHeader()}
                    
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        {features.map((feature, index) => {
                            const IconComponent = iconMap[feature.icon] || BookOpen;
                            return (
                                <motion.div 
                                    key={feature.id} 
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group"
                                >
                                    {/* Accent brand blob background */}
                                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[var(--color-primary)]/5 group-hover:bg-[var(--color-primary)]/10 transition-colors" />
                                    
                                    <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white mb-6 shadow-lg shadow-[var(--color-primary)]/20">
                                        <IconComponent size={24} />
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-200 outline-none w-full font-bold"
                                                value={feature.title}
                                                onChange={(e) => {
                                                    const newFeatures = [...features];
                                                    newFeatures[index].title = e.target.value;
                                                    onUpdate({ features: newFeatures });
                                                }}
                                            />
                                        ) : feature.title}
                                    </h3>
                                    
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        {isEditing ? (
                                            <textarea 
                                                className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none"
                                                value={feature.desc}
                                                onChange={(e) => {
                                                    const newFeatures = [...features];
                                                    newFeatures[index].desc = e.target.value;
                                                    onUpdate({ features: newFeatures });
                                                }}
                                            />
                                        ) : feature.desc}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: GRID (Default)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className={styles.sectionBg}>
            <div className="container px-6 mx-auto">
                {renderHeader()}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {features.map((feature, index) => {
                        const IconComponent = iconMap[feature.icon] || BookOpen;
                        return (
                            <motion.div 
                                key={feature.id} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                className={styles.cardClass}
                            >
                                <div className={styles.iconClass}>
                                    <IconComponent size={preset === 'minimal' ? 24 : 20} />
                                </div>
                                <h3 className={styles.textTitleClass}>
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-200 outline-none w-full"
                                            value={feature.title}
                                            onChange={(e) => {
                                                const newFeatures = [...features];
                                                newFeatures[index].title = e.target.value;
                                                onUpdate({ features: newFeatures });
                                            }}
                                        />
                                    ) : feature.title}
                                </h3>
                                <p className={styles.textDescClass}>
                                    {isEditing ? (
                                        <textarea 
                                            className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none"
                                            value={feature.desc}
                                            onChange={(e) => {
                                                const newFeatures = [...features];
                                                newFeatures[index].desc = e.target.value;
                                                onUpdate({ features: newFeatures });
                                            }}
                                        />
                                    ) : feature.desc}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FeaturesGrid;
