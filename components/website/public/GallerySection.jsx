"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import MediaPicker from '../widgets/MediaPicker';

const GallerySection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [pickerIndex, setPickerIndex] = useState(null);

    const {
        title = "Life at Our Institute",
        subtitle = "A glimpse into our campus, events, and student activities.",
        images = [
            { id: 1, url: "https://images.unsplash.com/photo-1523050853064-59f602992d42?q=80&w=800", caption: "Main Campus" },
            { id: 2, url: "https://images.unsplash.com/photo-1541339907198-e08756eaa589?q=80&w=800", caption: "Graduation Ceremony" },
            { id: 3, url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800", caption: "Science Lab" }
        ]
    } = content;

    const next = () => setActiveIndex((activeIndex + 1) % images.length);
    const prev = () => setActiveIndex((activeIndex - 1 + images.length) % images.length);

    const handleAddImage = () => {
        const newImages = [...images, { id: Date.now(), url: "https://images.unsplash.com/photo-1523050853064-59f602992d42?q=80&w=800", caption: "New Image" }];
        onUpdate({ images: newImages });
        setActiveIndex(newImages.length - 1);
    };

    const handleRemoveImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        onUpdate({ images: newImages });
        if (activeIndex >= newImages.length) setActiveIndex(Math.max(0, newImages.length - 1));
    };

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container px-6 mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-4xl font-extrabold text-slate-900">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h2>
                    <p className="mt-4 text-xl text-slate-500">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-slate-100 rounded p-3 w-full h-20 focus:border-blue-500 outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto group">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[40px] shadow-2xl">
                        <AnimatePresence mode="wait">
                            <motion.img 
                                key={activeIndex}
                                src={images[activeIndex]?.url}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.6 }}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>

                        {/* Edit Overlays */}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button 
                                    onClick={() => setPickerIndex(activeIndex)}
                                    className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white hover:bg-white/40 transition-all"
                                >
                                    <ImageIcon size={32} />
                                </button>
                                <button 
                                    onClick={() => handleRemoveImage(activeIndex)}
                                    className="p-4 bg-red-500/80 backdrop-blur-md rounded-2xl border border-red-500/30 text-white hover:bg-red-600 transition-all"
                                >
                                    <Trash2 size={32} />
                                </button>
                            </div>
                        )}

                        {/* Caption Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-12 bg-gradient-to-t from-black/80 to-transparent text-white">
                            <h3 className="text-2xl font-bold">
                                {isEditing ? (
                                    <input 
                                        className="bg-transparent border-b border-white/20 focus:border-white outline-none w-full"
                                        value={images[activeIndex]?.caption}
                                        onChange={(e) => {
                                            const newImages = [...images];
                                            newImages[activeIndex].caption = e.target.value;
                                            onUpdate({ images: newImages });
                                        }}
                                    />
                                ) : images[activeIndex]?.caption}
                            </h3>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-blue-600">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-blue-600">
                        <ChevronRight size={24} />
                    </button>

                    {/* Dots / Thumbnails */}
                    <div className="flex justify-center mt-8 gap-3">
                        {images.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setActiveIndex(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-12 bg-blue-600' : 'w-2 bg-slate-200'}`}
                            />
                        ))}
                        {isEditing && (
                            <button 
                                onClick={handleAddImage}
                                className="h-2 w-8 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                            >
                                <Plus size={12} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {pickerIndex !== null && (
                <MediaPicker 
                    currentUrl={images[pickerIndex].url}
                    onSelect={(url) => {
                        const newImages = [...images];
                        newImages[pickerIndex].url = url;
                        onUpdate({ images: newImages });
                        setPickerIndex(null);
                    }}
                    onClose={() => setPickerIndex(null)}
                />
            )}
        </section>
    );
};

export default GallerySection;
