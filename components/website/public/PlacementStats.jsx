"use client";

import React from 'react';
import { Briefcase, TrendingUp, Building2, Award } from 'lucide-react';

const iconMap = {
    'briefcase': Briefcase,
    'trend': TrendingUp,
    'building': Building2,
    'award': Award
};

const PlacementStats = ({ content = {}, isEditing = false, onUpdate }) => {
    const {
        title = "Our Placement Success",
        subtitle = "We bridge the gap between education and employment with our strong industry ties.",
        stats = [
            { id: 1, label: "Placement Rate", value: "95%", icon: 'briefcase' },
            { id: 2, label: "Hiring Partners", value: "200+", icon: 'building' },
            { id: 3, label: "Avg. Salary", value: "4.5 LPA", icon: 'trend' },
            { id: 4, label: "Certifications", value: "50+", icon: 'award' }
        ]
    } = content;

    return (
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
            </div>

            <div className="container px-6 mx-auto relative z-10">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <h2 className="text-4xl font-extrabold sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-white/20 focus:border-white outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h2>
                    <p className="mt-6 text-xl text-slate-400 leading-relaxed">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-white/10 rounded p-3 w-full h-24 focus:border-white outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {stats.map((stat, index) => {
                        const IconComponent = iconMap[stat.icon] || Briefcase;
                        return (
                            <div key={stat.id} className="text-center group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                                <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 rounded-2xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <IconComponent size={32} />
                                </div>
                                <div className="text-4xl font-black mb-2 tracking-tight">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-white/20 focus:border-white outline-none w-full text-center"
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
                                            className="bg-transparent border-b border-white/20 focus:border-white outline-none w-full text-center"
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
