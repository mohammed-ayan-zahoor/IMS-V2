"use client";

import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown, Save, Eye, Layout, Users, Copy, ExternalLink, Globe } from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from '@/contexts/ToastContext';
import HeroSection from '../public/HeroSection';
import FeaturesGrid from '../public/FeaturesGrid';
import ContactSection from '../public/ContactSection';
import SlidingNotices from '../public/SlidingNotices';
import FacultyDirectory from '../public/FacultyDirectory';
import PlacementStats from '../public/PlacementStats';
import ProgramsSection from '../public/ProgramsSection';
import TestimonialsSection from '../public/TestimonialsSection';
import GallerySection from '../public/GallerySection';
import FooterSection from '../public/FooterSection';
import { SECTION_TYPES, DEFAULT_SECTION_DATA } from '@/services/pageBuilderService';
import { useWebsitePresence } from '@/hooks/useWebsitePresence';

const SectionWrapper = ({ section, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, instituteId }) => {
    const renderSection = () => {
        switch (section.type) {
            case SECTION_TYPES.HERO:
                return <HeroSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.FEATURES:
                return <FeaturesGrid content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.CONTACT:
                return <ContactSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.NOTICES:
                return <SlidingNotices instituteId={instituteId} isEditing={true} />;
            case SECTION_TYPES.FACULTY:
                return <FacultyDirectory content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.PLACEMENT_STATS:
                return <PlacementStats content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.PROGRAMS:
                return <ProgramsSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} instituteId={instituteId} />;
            case SECTION_TYPES.TESTIMONIALS:
                return <TestimonialsSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.GALLERY:
                return <GallerySection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.FOOTER:
                return <FooterSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            default:
                return (
                    <div className="p-20 bg-slate-100 text-center border-2 border-dashed border-slate-300 rounded-2xl">
                        <Layout className="mx-auto mb-4 text-slate-400" size={48} />
                        <h3 className="text-xl font-bold text-slate-600">Section Type: {section.type}</h3>
                        <p className="text-slate-400">Content editor coming soon...</p>
                    </div>
                );
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="group relative mb-8 border-2 border-transparent hover:border-blue-500 rounded-3xl transition-all overflow-hidden"
        >
            {/* Control Overlay */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                    <button 
                        onClick={onMoveUp}
                        disabled={isFirst}
                        className="p-2 hover:bg-slate-50 disabled:opacity-30 text-slate-600 border-b border-slate-100"
                    >
                        <ChevronUp size={18} />
                    </button>
                    <button 
                        onClick={onMoveDown}
                        disabled={isLast}
                        className="p-2 hover:bg-slate-50 disabled:opacity-30 text-slate-600"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
                <button 
                    onClick={() => onDelete(section.id)}
                    className="p-3 bg-red-500 text-white rounded-xl shadow-xl hover:bg-red-600 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="pointer-events-auto">
                {renderSection()}
            </div>
        </motion.div>
    );
};

const DragDropEditor = ({ initialSections = [], onSave, instituteId, instituteCode, pageSlug = 'index' }) => {
    const [sections, setSections] = useState(initialSections);
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/website/${instituteCode}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        toast.success("Link copied to clipboard!");
    };

    // Real-time Sync
    const { presence } = useWebsitePresence(instituteId, pageSlug, (newSections) => {
        setSections(newSections);
    });

    const handleAddSection = (type) => {
        const newSection = {
            id: `${type}-${Date.now()}`,
            type,
            content: DEFAULT_SECTION_DATA[type] || {}
        };
        setSections([...sections, newSection]);
        toast.success(`${type.replace('_', ' ')} section added!`);
        
        // Scroll to bottom after state update
        setTimeout(() => {
            const canvas = document.getElementById('website-canvas');
            if (canvas) canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleUpdateSection = (id, newContent) => {
        setSections(prev => prev.map(s => 
            s.id === id ? { ...s, content: { ...s.content, ...newContent } } : s
        ));
    };

    const handleDeleteSection = (id) => {
        if (confirm("Delete this section?")) {
            setSections(prev => prev.filter(s => s.id !== id));
        }
    };

    const moveSection = (index, direction) => {
        const newSections = [...sections];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newSections.length) {
            [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
            setSections(newSections);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(sections);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar: Section Library */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Layout className="text-blue-600" />
                                Sections
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Build your page</p>
                        </div>
                        
                        {/* Presence Indicators */}
                        <div className="flex -space-x-2 overflow-hidden">
                            {presence.slice(0, 3).map((user, i) => (
                                <div 
                                    key={user.id} 
                                    title={user.name}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200"
                                >
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Share / Preview Card */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Globe size={10} />
                                Public Link
                            </span>
                            <a 
                                href={publicUrl} 
                                target="_blank" 
                                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                                Visit Site <ExternalLink size={10} />
                            </a>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 group">
                            <div className="flex-1 text-[10px] font-medium text-slate-500 truncate">
                                {publicUrl}
                            </div>
                            <button 
                                onClick={handleCopyLink}
                                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Copy Link"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {Object.values(SECTION_TYPES).map(type => (
                        <motion.button
                            key={type}
                            onClick={() => handleAddSection(type)}
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full p-4 flex items-center gap-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm border border-slate-100">
                                <Plus size={20} />
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-slate-700 capitalize">{type.replace('_', ' ')}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Block</span>
                            </div>
                        </motion.button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-premium-blue text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:opacity-50 transition-all"
                    >
                        {isSaving ? "Saving..." : "Save Page"}
                        <Save size={18} />
                    </button>
                </div>
            </div>

            {/* Main Canvas */}
            <div id="website-canvas" className="flex-1 overflow-y-auto bg-slate-100/50 p-12">
                <div className="max-w-5xl mx-auto min-h-full bg-white shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden border border-slate-200 border-dashed p-4">
                    {sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                                <Layout size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-600">Your canvas is empty</h3>
                            <p className="mt-2">Start building by adding sections from the sidebar</p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {sections.map((section, index) => (
                                <SectionWrapper 
                                    key={section.id} 
                                    section={section} 
                                    onUpdate={handleUpdateSection}
                                    onDelete={handleDeleteSection}
                                    onMoveUp={() => moveSection(index, -1)}
                                    onMoveDown={() => moveSection(index, 1)}
                                    isFirst={index === 0}
                                    isLast={index === sections.length - 1}
                                    instituteId={instituteId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DragDropEditor;
