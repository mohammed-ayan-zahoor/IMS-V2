"use client";

import React from 'react';
import { Briefcase, TrendingUp, Building2, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const iconMap = {
    'briefcase': Briefcase,
    'trend': TrendingUp,
    'building': Building2,
    'award': Award
};

const PlacementStats = ({ content = {}, isEditing = false, onUpdate, preset = 'modern' }) => {
    const {
        title = "Our Placement Success",
        subtitle = "We bridge the gap between education and employment with our strong industry ties.",
        layout = "simple", // simple, cards, bento
        stats = [
            { id: 1, label: "Placement Rate", value: "95%", icon: 'briefcase' },
            { id: 2, label: "Hiring Partners", value: "200+", icon: 'building' },
            { id: 3, label: "Avg. Salary", value: "4.5 LPA", icon: 'trend' },
            { id: 4, label: "Certifications", value: "50+", icon: 'award' }
        ]
    } = content;

    const getPresetStyles = () => {
        switch (preset) {
            case 'classic':
                return {
                    sectionBg: "py-24 bg-[#FCFBF7] text-slate-900 border-y border-slate-200",
                    titleClass: "text-4xl font-serif font-bold tracking-tight text-slate-900",
                    subtitleClass: "mt-4 text-slate-600 font-serif leading-relaxed"
                };
            case 'bold':
                return {
                    sectionBg: "py-24 bg-white text-slate-950 border-y-4 border-slate-950",
                    titleClass: "text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-950",
                    subtitleClass: "mt-4 text-slate-700 font-bold"
                };
            case 'minimal':
                return {
                    sectionBg: "py-20 bg-white text-slate-900 border-y border-slate-100",
                    titleClass: "text-3xl font-light tracking-tight text-slate-900",
                    subtitleClass: "mt-4 text-sm text-slate-500 max-w-xl mx-auto"
                };
            case 'dark':
                return {
                    sectionBg: "py-24 bg-slate-950 text-white",
                    titleClass: "text-4xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400",
                    subtitleClass: "mt-4 text-slate-400 font-mono"
                };
            case 'modern':
            default:
                return {
                    sectionBg: "py-24 bg-slate-900 text-white",
                    titleClass: "text-4xl font-extrabold sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400",
                    subtitleClass: "mt-6 text-xl text-slate-400 leading-relaxed"
                };
        }
    };

    const styles = getPresetStyles();

    const renderHeader = () => (
        <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className={styles.titleClass}>
                {isEditing ? (
                    <input 
                        className="bg-transparent border-b border-white/20 focus:border-white outline-none w-full text-center font-inherit"
                        value={title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                    />
                ) : title}
            </h2>
            <p className={styles.subtitleClass}>
                {isEditing ? (
                    <textarea 
                        className="bg-transparent border border-white/10 rounded p-3 w-full h-24 focus:border-white outline-none text-center font-inherit"
                        value={subtitle}
                        onChange={(e) => onUpdate({ subtitle: e.target.value })}
                    />
                ) : subtitle}
            </p>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: BENTO GRID (Highly modern asymmetric layout)
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "bento") {
        return (
            <section className={cn(styles.sectionBg, "overflow-hidden relative")}>
                <div className="container px-6 mx-auto relative z-10">
                    {renderHeader()}
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 max-w-5xl mx-auto">
                        {stats.map((stat, index) => {
                            const IconComponent = iconMap[stat.icon] || Briefcase;
                            const isLarge = index === 0 || index === 3;
                            return (
                                <motion.div 
                                    key={stat.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className={cn(
                                        "p-8 rounded-[36px] flex flex-col justify-between transition-all duration-300",
                                        preset === 'dark' || preset === 'modern'
                                            ? "bg-white/5 border border-white/10 hover:bg-white/10"
                                            : "bg-slate-50 border border-slate-200/60 hover:bg-slate-100/80",
                                        isLarge ? "md:col-span-4" : "md:col-span-2",
                                        isLarge && "flex-row items-center gap-8 text-left"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-1",
                                        isLarge && "space-y-2"
                                    )}>
                                        <div className="text-5xl font-black tracking-tight mb-2">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-300 outline-none w-full font-black text-center md:text-left"
                                                    value={stat.value}
                                                    onChange={(e) => {
                                                        const newStats = [...stats];
                                                        newStats[index].value = e.target.value;
                                                        onUpdate({ stats: newStats });
                                                    }}
                                                />
                                            ) : stat.value}
                                        </div>
                                        
                                        <div className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-300 outline-none w-full text-center md:text-left"
                                                    value={stat.label}
                                                    onChange={(e) => {
                                                        const newStats = [...stats];
                                                        newStats[index].label = e.target.value;
                                                        onUpdate({ stats: newStats });
                                                    }}
                                                />
                                            ) : stat.label}
                                        </div>
                                    </div>
                                    
                                    <div className={cn(
                                        "w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shrink-0",
                                        !isLarge && "mx-auto mt-6"
                                    )}>
                                        <IconComponent size={26} />
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
    // LAYOUT: CARDS (Clean card-deck style)
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "cards") {
        return (
            <section className={cn(styles.sectionBg, "overflow-hidden relative")}>
                <div className="container px-6 mx-auto relative z-10">
                    {renderHeader()}
                    
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4 max-w-6xl mx-auto">
                        {stats.map((stat, index) => {
                            const IconComponent = iconMap[stat.icon] || Briefcase;
                            return (
                                <motion.div 
                                    key={stat.id} 
                                    initial={{ opacity: 0, y: 25 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className={cn(
                                        "p-8 rounded-3xl text-center shadow-lg transition-transform hover:-translate-y-2",
                                        preset === 'dark' || preset === 'modern'
                                            ? "bg-slate-900 border border-slate-800"
                                            : "bg-white border border-slate-200"
                                    )}
                                >
                                    <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 rounded-2xl mx-auto mb-6">
                                        <IconComponent size={30} />
                                    </div>
                                    <div className="text-4xl font-extrabold mb-2">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-300 outline-none w-full text-center"
                                                value={stat.value}
                                                onChange={(e) => {
                                                    const newStats = [...stats];
                                                    newStats[index].value = e.target.value;
                                                    onUpdate({ stats: newStats });
                                                }}
                                            />
                                        ) : stat.value}
                                    </div>
                                    <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-300 outline-none w-full text-center"
                                                value={stat.label}
                                                onChange={(e) => {
                                                    const newStats = [...stats];
                                                    newStats[index].label = e.target.value;
                                                    onUpdate({ stats: newStats });
                                                }}
                                            />
                                        ) : stat.label}
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
    // LAYOUT: SIMPLE (Clean indicators, default)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className={cn(styles.sectionBg, "overflow-hidden relative")}>
            <div className="container px-6 mx-auto relative z-10">
                {renderHeader()}

                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 max-w-5xl mx-auto">
                    {stats.map((stat, index) => {
                        const IconComponent = iconMap[stat.icon] || Briefcase;
                        return (
                            <div key={stat.id} className="text-center group p-6 rounded-2xl hover:scale-105 transition-transform duration-300">
                                <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-2xl mx-auto mb-6">
                                    <IconComponent size={24} />
                                </div>
                                <div className="text-4xl font-black mb-2 tracking-tight">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-300 outline-none w-full text-center"
                                            value={stat.value}
                                            onChange={(e) => {
                                                const newStats = [...stats];
                                                newStats[index].value = e.target.value;
                                                onUpdate({ stats: newStats });
                                            }}
                                        />
                                    ) : stat.value}
                                </div>
                                <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-300 outline-none w-full text-center"
                                            value={stat.label}
                                            onChange={(e) => {
                                                const newStats = [...stats];
                                                newStats[index].label = e.target.value;
                                                onUpdate({ stats: newStats });
                                            }}
                                        />
                                    ) : stat.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default PlacementStats;
