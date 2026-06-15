"use client";

import React, { useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaPicker from '../widgets/MediaPicker';
import { CoverFlow } from './CoverFlow';

const TestimonialsSection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [showPicker, setShowPicker] = useState(false);

    const {
        title = "Voices of Success",
        subtitle = "Our students and alumni share their transformational experiences.",
        layout = "carousel", // carousel, grid, CoverFlow
        items = [
            { id: 1, name: "Alex Johnson", role: "Graduate", text: "The hands-on training and industry mentors provided a perfect platform for my career growth. Highly recommended!", image: "https://i.pravatar.cc/150?u=alex" },
            { id: 2, name: "Maria Garcia", role: "Sr. Student", text: "Exceptional infrastructure and dedicated faculty. The practical approach to learning is what sets this institute apart.", image: "https://i.pravatar.cc/150?u=maria" }
        ]
    } = content;

    const next = () => setActiveIndex((activeIndex + 1) % items.length);
    const prev = () => setActiveIndex((activeIndex - 1 + items.length) % items.length);

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: COVERFLOW (Premium 3D layout)
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "CoverFlow") {
        const coverFlowItems = items.map(item => ({
            id: item.id || item._id,
            title: item.name,
            subtitle: item.role,
            image: item.image,
            text: item.text
        }));

        return (
            <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <div className="container px-6 mx-auto">
                    <div className="max-w-3xl mx-auto text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                    value={title}
                                    onChange={(e) => onUpdate({ title: e.target.value })}
                                />
                            ) : title}
                        </h2>
                        <p className="mt-6 text-xl text-slate-500 dark:text-slate-400">
                            {isEditing ? (
                                <textarea 
                                    className="bg-transparent border border-slate-100 rounded p-3 w-full h-24 focus:border-blue-500 outline-none text-center"
                                    value={subtitle}
                                    onChange={(e) => onUpdate({ subtitle: e.target.value })}
                                />
                            ) : subtitle}
                        </p>
                    </div>

                    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
                        {/* CoverFlow component */}
                        <div className="h-[420px] w-full flex items-center justify-center relative">
                            <CoverFlow 
                                items={coverFlowItems}
                                initialIndex={activeIndex}
                                onIndexChange={(idx) => setActiveIndex(idx)}
                                enableReflection={true}
                                enableAudio={false}
                                itemWidth={280}
                                itemHeight={280}
                            />
                        </div>

                        {/* Quote Box under CoverFlow */}
                        <div className="w-full max-w-3xl mt-8">
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeIndex}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl relative text-center"
                                >
                                    <Quote className="absolute top-4 left-4 text-slate-100 dark:text-slate-800/80" size={48} />
                                    
                                    <div className="flex justify-center gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                                    </div>

                                    <p className="text-xl font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed mb-6">
                                        "{isEditing ? (
                                            <textarea 
                                                className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none text-center"
                                                value={items[activeIndex]?.text || ""}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[activeIndex].text = e.target.value;
                                                    onUpdate({ items: newItems });
                                                }}
                                            />
                                        ) : (items[activeIndex]?.text || "")}"
                                    </p>

                                    <div className="flex items-center justify-center gap-2">
                                        <h4 className="text-lg font-black text-slate-950 dark:text-white">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-200 outline-none w-32 font-bold text-center"
                                                    value={items[activeIndex]?.name || ""}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[activeIndex].name = e.target.value;
                                                        onUpdate({ items: newItems });
                                                    }}
                                                />
                                            ) : (items[activeIndex]?.name || "")}
                                        </h4>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-500">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-200 outline-none w-32 text-center"
                                                    value={items[activeIndex]?.role || ""}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[activeIndex].role = e.target.value;
                                                        onUpdate({ items: newItems });
                                                    }}
                                                />
                                            ) : (items[activeIndex]?.role || "")}
                                        </p>
                                    </div>
                                    
                                    {isEditing && (
                                        <div className="mt-4 flex justify-center">
                                            <button 
                                                onClick={() => setShowPicker(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 font-bold text-xs"
                                            >
                                                <ImageIcon size={14} />
                                                Edit Photo
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {showPicker && isEditing && (
                        <MediaPicker 
                            currentUrl={items[activeIndex]?.image}
                            onSelect={(url) => {
                                const newItems = [...items];
                                newItems[activeIndex].image = url;
                                onUpdate({ items: newItems });
                                setShowPicker(false);
                            }}
                            onClose={() => setShowPicker(false)}
                        />
                    )}
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: GRID
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "grid") {
        return (
            <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <div className="container px-6 mx-auto">
                    <div className="max-w-3xl mx-auto text-center mb-20">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                    value={title}
                                    onChange={(e) => onUpdate({ title: e.target.value })}
                                />
                            ) : title}
                        </h2>
                        <p className="mt-6 text-xl text-slate-500 dark:text-slate-400">
                            {isEditing ? (
                                <textarea 
                                    className="bg-transparent border border-slate-100 rounded p-3 w-full h-24 focus:border-blue-500 outline-none text-center"
                                    value={subtitle}
                                    onChange={(e) => onUpdate({ subtitle: e.target.value })}
                                />
                            ) : subtitle}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {items.map((item, idx) => (
                            <motion.div 
                                key={item.id || idx}
                                initial={{ opacity: 0, y: 25 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl relative flex flex-col justify-between"
                            >
                                <Quote className="absolute top-4 right-4 text-slate-100 dark:text-slate-800/80" size={32} />
                                
                                <div className="space-y-4">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                                    </div>
                                    <p className="text-base text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                        "{isEditing ? (
                                            <textarea 
                                                className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none text-left"
                                                value={item.text}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[idx].text = e.target.value;
                                                    onUpdate({ items: newItems });
                                                }}
                                            />
                                        ) : item.text}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-950 dark:text-white">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-200 outline-none w-32 font-bold"
                                                    value={item.name}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].name = e.target.value;
                                                        onUpdate({ items: newItems });
                                                    }}
                                                />
                                            ) : item.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-transparent border-b border-slate-200 outline-none w-32"
                                                    value={item.role}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].role = e.target.value;
                                                        onUpdate({ items: newItems });
                                                    }}
                                                />
                                            ) : item.role}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: CAROUSEL (Default)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className="py-24 bg-slate-50 overflow-hidden">
            <div className="container px-6 mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <h2 className="text-4xl font-extrabold text-slate-900">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h2>
                    <p className="mt-6 text-xl text-slate-500">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-slate-100 rounded p-3 w-full h-24 focus:border-blue-500 outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>
                </div>

                <div className="max-w-5xl mx-auto relative">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={activeIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-12 md:p-20 rounded-[60px] shadow-2xl shadow-blue-500/5 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden"
                        >
                            <Quote className="absolute top-12 left-12" style={{ color: 'var(--color-primary)', opacity: 0.1 }} size={120} />
                            
                            <div className="relative w-48 h-48 shrink-0 group">
                                <div className="absolute inset-0 rounded-[40px] rotate-12" style={{ backgroundColor: 'var(--color-primary)' }} />
                                <div className="relative w-full h-full overflow-hidden rounded-[40px] shadow-xl">
                                    <img 
                                        src={items[activeIndex]?.image} 
                                        alt={items[activeIndex]?.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {isEditing && (
                                        <div 
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => setShowPicker(true)}
                                        >
                                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 text-white">
                                                <ImageIcon size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {showPicker && isEditing && (
                                    <MediaPicker 
                                        currentUrl={items[activeIndex]?.image}
                                        onSelect={(url) => {
                                            const newItems = [...items];
                                            newItems[activeIndex].image = url;
                                            onUpdate({ items: newItems });
                                            setShowPicker(false);
                                        }}
                                        onClose={() => setShowPicker(false)}
                                    />
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-6 relative z-10">
                                <div className="flex justify-center md:justify-start gap-1">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />)}
                                </div>
                                <p className="text-2xl font-medium text-slate-700 italic leading-relaxed">
                                    "{items[activeIndex]?.text}"
                                </p>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">{items[activeIndex]?.name}</h4>
                                    <p className="font-bold uppercase tracking-widest text-xs mt-1" style={{ color: 'var(--color-primary)' }}>{items[activeIndex]?.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-center mt-12 gap-4">
                        <button onClick={prev} className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center transition-all shadow-lg shadow-slate-200">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={next} className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center transition-all shadow-lg shadow-slate-200">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
