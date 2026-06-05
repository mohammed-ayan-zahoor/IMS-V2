"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import MediaPicker from '../widgets/MediaPicker';
import { CoverFlow } from './CoverFlow';
import { HoverExpand } from './HoverExpand';

const GallerySection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [pickerIndex, setPickerIndex] = useState(null);

    const {
        title = "Life at Our Institute",
        subtitle = "A glimpse into our campus, events, and student activities.",
        layout = "slider", // slider, grid, CoverFlow, HoverExpand
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

    const renderHeader = () => (
        <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {isEditing ? (
                    <input 
                        className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                        value={title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                    />
                ) : title}
            </h2>
            <p className="mt-4 text-xl text-slate-500 dark:text-slate-400">
                {isEditing ? (
                    <textarea 
                        className="bg-transparent border border-slate-100 rounded p-3 w-full h-20 focus:border-blue-500 outline-none text-center"
                        value={subtitle}
                        onChange={(e) => onUpdate({ subtitle: e.target.value })}
                    />
                ) : subtitle}
            </p>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: COVERFLOW
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "CoverFlow") {
        const coverFlowItems = images.map((img, i) => ({
            id: img.id || i,
            title: img.caption || `Image #${i + 1}`,
            image: img.url
        }));

        return (
            <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
                <div className="container px-6 mx-auto">
                    {renderHeader()}
                    
                    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
                        <div className="h-[450px] w-full flex items-center justify-center relative">
                            <CoverFlow 
                                items={coverFlowItems}
                                initialIndex={activeIndex}
                                onIndexChange={(idx) => setActiveIndex(idx)}
                                enableReflection={true}
                                enableAudio={false}
                                itemWidth={360}
                                itemHeight={360}
                            />
                        </div>
                        
                        {isEditing && (
                            <div className="mt-8 flex gap-4">
                                <button 
                                    onClick={() => setPickerIndex(activeIndex)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Change Image
                                </button>
                                <button 
                                    onClick={() => handleRemoveImage(activeIndex)}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold"
                                >
                                    Remove Image
                                </button>
                                <button 
                                    onClick={handleAddImage}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold"
                                >
                                    Add Image
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {pickerIndex !== null && (
                    <MediaPicker 
                        currentUrl={images[pickerIndex]?.url}
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: HOVER EXPAND
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "HoverExpand") {
        const hoverExpandImages = images.map((img, i) => ({
            src: img.url,
            alt: img.caption || "",
            caption: img.caption || "",
            code: `GALLERY #${i + 1}`
        }));

        return (
            <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
                <div className="container px-6 mx-auto">
                    {renderHeader()}
                    
                    <div className="w-full">
                        <HoverExpand 
                            images={hoverExpandImages}
                            onItemClick={(item, idx) => {
                                if (isEditing) {
                                    setPickerIndex(idx);
                                }
                            }}
                        />

                        {isEditing && (
                            <div className="mt-8 flex justify-center gap-4">
                                <button 
                                    onClick={handleAddImage}
                                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add Image
                                </button>
                                {images.length > 0 && (
                                    <button 
                                        onClick={() => handleRemoveImage(images.length - 1)}
                                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> Remove Last
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {pickerIndex !== null && (
                    <MediaPicker 
                        currentUrl={images[pickerIndex]?.url}
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: GRID
    // ─────────────────────────────────────────────────────────────────────────
    if (layout === "grid") {
        return (
            <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
                <div className="container px-6 mx-auto">
                    {renderHeader()}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {images.map((img, idx) => (
                            <motion.div 
                                key={img.id || idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className="relative aspect-[4/3] rounded-[24px] overflow-hidden group shadow-lg"
                            >
                                <img src={img.url} alt={img.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6" />
                                
                                <div className="absolute bottom-0 left-0 w-full p-6 text-white translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <h3 className="text-lg font-bold">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-white/30 focus:border-white outline-none w-full"
                                                value={img.caption}
                                                onChange={(e) => {
                                                    const newImages = [...images];
                                                    newImages[idx].caption = e.target.value;
                                                    onUpdate({ images: newImages });
                                                }}
                                            />
                                        ) : img.caption}
                                    </h3>
                                </div>

                                {isEditing && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setPickerIndex(idx)}
                                            className="p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 text-white hover:bg-white/40 transition-all"
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveImage(idx)}
                                            className="p-2 bg-red-500/80 backdrop-blur-md rounded-xl border border-red-500/30 text-white hover:bg-red-600 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {isEditing && (
                            <button 
                                onClick={handleAddImage}
                                className="aspect-[4/3] rounded-[24px] border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 flex flex-col items-center justify-center gap-2 group transition-all"
                            >
                                <Plus size={24} className="text-slate-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-slate-500 font-bold">Add Image</span>
                            </button>
                        )}
                    </div>
                </div>
                {pickerIndex !== null && (
                    <MediaPicker 
                        currentUrl={images[pickerIndex]?.url}
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT: SLIDER (Default)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container px-6 mx-auto">
                {renderHeader()}

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
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
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
                        <div className="absolute bottom-0 left-0 w-full p-12 bg-gradient-to-t from-black/80 to-transparent text-white z-10">
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
                    <button 
                        onClick={prev} 
                        className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-blue-600 z-10"
                        aria-label="Previous image"
                        aria-controls="gallery-content"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={next} 
                        className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-blue-600 z-10"
                        aria-label="Next image"
                        aria-controls="gallery-content"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Dots / Thumbnails */}
                    <div className="flex justify-center mt-8 gap-3" role="tablist" aria-label="Gallery image selector">
                        {images.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setActiveIndex(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-12' : 'w-2 bg-slate-200'}`}
                                style={i === activeIndex ? { backgroundColor: 'var(--color-primary)' } : undefined}
                                role="tab"
                                aria-selected={i === activeIndex}
                                aria-label={`Show image ${i + 1}`}
                            />
                        ))}
                        {isEditing && (
                            <button 
                                onClick={handleAddImage}
                                className="h-2 w-8 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                aria-label="Add new image to gallery"
                            >
                                <Plus size={12} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {pickerIndex !== null && (
                <MediaPicker 
                    currentUrl={images[pickerIndex]?.url}
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
