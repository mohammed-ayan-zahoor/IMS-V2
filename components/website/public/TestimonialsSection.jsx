"use client";

import React, { useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaPicker from '../widgets/MediaPicker';

const TestimonialsSection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [showPicker, setShowPicker] = useState(false);

    const {
        title = "Voices of Success",
        subtitle = "Our students and alumni share their transformational experiences.",
        items = [
            { id: 1, name: "Alex Johnson", role: "Graduate", text: "The hands-on training and industry mentors provided a perfect platform for my career growth. Highly recommended!", image: "https://i.pravatar.cc/150?u=alex" },
            { id: 2, name: "Maria Garcia", role: "Sr. Student", text: "Exceptional infrastructure and dedicated faculty. The practical approach to learning is what sets this institute apart.", image: "https://i.pravatar.cc/150?u=maria" }
        ]
    } = content;

    const next = () => setActiveIndex((activeIndex + 1) % items.length);
    const prev = () => setActiveIndex((activeIndex - 1 + items.length) % items.length);

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
                            <Quote className="absolute top-12 left-12 text-blue-500/10" size={120} />
                            
                            <div className="relative w-48 h-48 shrink-0 group">
                                <div className="absolute inset-0 bg-blue-500 rounded-[40px] rotate-12" />
                                <div className="relative w-full h-full overflow-hidden rounded-[40px] shadow-xl">
                                    <img 
                                        src={items[activeIndex].image} 
                                        alt={items[activeIndex].name}
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

                                {showPicker && (
                                    <MediaPicker 
                                        currentUrl={items[activeIndex].image}
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
                                    "{items[activeIndex].text}"
                                </p>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">{items[activeIndex].name}</h4>
                                    <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-1">{items[activeIndex].role}</p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-center mt-12 gap-4">
                        <button onClick={prev} className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-slate-200">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={next} className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-slate-200">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
