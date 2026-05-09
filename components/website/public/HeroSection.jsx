"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from 'lucide-react';
import MediaPicker from '../widgets/MediaPicker';

const HeroSection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const {
        title = "Welcome to Our Institute",
        subtitle = "Empowering students through quality education and professional training.",
        backgroundImage = "https://images.unsplash.com/photo-1523050853064-59f602992d42?q=80&w=2000",
        ctaText = "Explore Programs",
        ctaLink = "#",
        alignment = "center" // left, center, right
    } = content;

    return (
        <section className="relative min-h-[70vh] flex items-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            >
                <div className="absolute inset-0 bg-black/50" />
            </div>

            {/* Image Picker Trigger */}
            {isEditing && (
                <div className="absolute top-4 left-4 z-50">
                    <button 
                        onClick={() => setShowPicker(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all font-bold text-sm"
                    >
                        <ImageIcon size={16} />
                        Change Background
                    </button>
                </div>
            )}

            {showPicker && (
                <MediaPicker 
                    currentUrl={backgroundImage}
                    onSelect={(url) => {
                        onUpdate({ backgroundImage: url });
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}

            <div className="container relative z-10 px-6 py-20 mx-auto">
                <div className={cn(
                    "max-w-3xl space-y-6",
                    alignment === "center" && "mx-auto text-center",
                    alignment === "right" && "ml-auto text-right"
                )}>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-white/30 focus:border-white outline-none w-full"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h1>
                    
                    <p className="text-xl text-slate-200 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-white/20 rounded p-2 w-full h-24 focus:border-white outline-none"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>

                    <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <a 
                            href={ctaLink}
                            className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-premium-blue rounded-xl hover:bg-premium-blue/90 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25"
                        >
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-white/30 focus:border-white outline-none w-32"
                                    value={ctaText}
                                    onChange={(e) => onUpdate({ ctaText: e.target.value })}
                                />
                            ) : ctaText}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
