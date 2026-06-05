"use client";

import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown, Save, Layout, Copy, ExternalLink, Globe } from 'lucide-react';
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

const SECTION_LAYOUTS = {
    [SECTION_TYPES.HERO]: ['centered', 'split', 'banner'],
    [SECTION_TYPES.FEATURES]: ['grid', 'cards', 'list'],
    [SECTION_TYPES.PLACEMENT_STATS]: ['simple', 'cards', 'bento'],
    [SECTION_TYPES.TESTIMONIALS]: ['carousel', 'grid', 'CoverFlow'],
    [SECTION_TYPES.GALLERY]: ['slider', 'grid', 'CoverFlow', 'HoverExpand'],
    [SECTION_TYPES.FACULTY]: ['grid', 'cards', 'carousel'],
    [SECTION_TYPES.PROGRAMS]: ['grid', 'cards', 'list'],
    [SECTION_TYPES.CONTACT]: ['split', 'centered', 'simple'],
    [SECTION_TYPES.FOOTER]: ['classic', 'simple'],
    [SECTION_TYPES.NOTICES]: ['ticker', 'list']
};

const SectionWrapper = ({ section, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, instituteId, preset }) => {
    const dragControls = useDragControls();

    const renderSection = () => {
        switch (section.type) {
            case SECTION_TYPES.HERO:
                return <HeroSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} preset={preset} />;
            case SECTION_TYPES.FEATURES:
                return <FeaturesGrid content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} preset={preset} />;
            case SECTION_TYPES.CONTACT:
                return <ContactSection content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.NOTICES:
                return <SlidingNotices content={section.content} onUpdate={(data) => onUpdate(section.id, data)} instituteId={instituteId} isEditing={true} />;
            case SECTION_TYPES.FACULTY:
                return <FacultyDirectory content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} />;
            case SECTION_TYPES.PLACEMENT_STATS:
                return <PlacementStats content={section.content} isEditing={true} onUpdate={(data) => onUpdate(section.id, data)} preset={preset} />;
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
        <Reorder.Item 
            value={section}
            id={section.id}
            dragListener={false}
            dragControls={dragControls}
            className="group relative mb-8 border-2 border-transparent hover:border-blue-500 rounded-3xl transition-all overflow-hidden bg-white shadow-sm"
        >
            {/* Control & Drag Overlay */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Layout Selector */}
                {SECTION_LAYOUTS[section.type] && (
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl shadow-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">Layout:</span>
                        <select 
                            value={section.content?.layout || SECTION_LAYOUTS[section.type][0]}
                            onChange={(e) => onUpdate(section.id, { layout: e.target.value })}
                            className="text-xs font-bold text-slate-800 bg-slate-50 border-0 outline-none rounded-lg py-1.5 px-2 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {SECTION_LAYOUTS[section.type].map(layoutOpt => (
                                <option key={layoutOpt} value={layoutOpt}>
                                    {layoutOpt.replace(/([A-Z])/g, ' $1')}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Drag Handle */}
                <div 
                    onPointerDown={(e) => dragControls.start(e)}
                    className="p-3 bg-white text-slate-600 rounded-xl shadow-xl border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors"
                    title="Drag to Reorder"
                >
                    <GripVertical size={18} />
                </div>
                
                {/* Button controls (Up/Down) */}
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
        </Reorder.Item>
    );
};

const THEME_PRESETS = {
    modern:  { primary: '#3B82F6', secondary: '#8B5CF6', font: 'Inter' },
    classic: { primary: '#1e3a5f', secondary: '#c9a84c', font: 'Merriweather' },
    bold:    { primary: '#7C3AED', secondary: '#EC4899', font: 'Outfit' },
    minimal: { primary: '#18181B', secondary: '#71717A', font: 'DM Sans' },
    dark:    { primary: '#10B981', secondary: '#3B82F6', font: 'Space Grotesk' },
};

const DragDropEditor = ({ 
    initialSections = [], 
    onSave, 
    instituteId, 
    instituteCode, 
    pageSlug = 'index', 
    initialConfig = {},
    pages = [],
    activePage = null,
    onCreatePage,
    onDeletePage,
    onSwitchPage
}) => {
    const [sections, setSections] = useState(initialSections);
    const [config, setConfig] = useState(initialConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfigSaving, setIsConfigSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('sections'); // 'sections' | 'page-seo' | 'theme'
    const [showNewPageForm, setShowNewPageForm] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageSlug, setNewPageSlug] = useState('');
    
    // Page SEO states
    const [pageTitle, setPageTitle] = useState(activePage?.title || '');
    const [pageSlugInput, setPageSlugInput] = useState(activePage?.slug || '');
    const [seoTitle, setSeoTitle] = useState(activePage?.seoTitle || '');
    const [seoDescription, setSeoDescription] = useState(activePage?.seoDescription || '');
    const [keywords, setKeywords] = useState(activePage?.keywords || '');
    
    const toast = useToast();

    useEffect(() => {
        setSections(initialSections);
    }, [initialSections]);

    useEffect(() => {
        setPageTitle(activePage?.title || '');
        setPageSlugInput(activePage?.slug || '');
        setSeoTitle(activePage?.seoTitle || '');
        setSeoDescription(activePage?.seoDescription || '');
        setKeywords(activePage?.keywords || '');
    }, [activePage]);

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
            await onSave(sections, {
                title: pageTitle,
                slug: pageSlugInput,
                seoTitle,
                seoDescription,
                keywords
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateConfig = async (updatedFields) => {
        const newConfig = {
            ...config,
            ...updatedFields,
            branding: {
                ...(config.branding || {}),
                ...(updatedFields.branding || {})
            },
            settings: {
                ...(config.settings || {}),
                ...(updatedFields.settings || {})
            },
            theme: {
                ...(config.theme || {}),
                ...(updatedFields.theme || {})
            }
        };

        setConfig(newConfig);
        setIsConfigSaving(true);

        try {
            const res = await fetch('/api/v1/website/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });

            if (!res.ok) {
                toast.error("Failed to save theme settings");
            }
        } catch (error) {
            console.error("Config save error:", error);
            toast.error("Error saving theme settings");
        } finally {
            setIsConfigSaving(false);
        }
    };

    const handleApplyPreset = (presetName) => {
        const preset = THEME_PRESETS[presetName];
        if (!preset) return;

        handleUpdateConfig({
            theme: { preset: presetName },
            branding: {
                primaryColor: preset.primary,
                secondaryColor: preset.secondary,
                fontFamily: preset.font
            }
        });
        toast.success(`Applied ${presetName} theme preset!`);
    };
    // Calculate theme values for editor live preview
    const activePreset = THEME_PRESETS[config?.theme?.preset || 'modern'];
    const primaryColor = config?.branding?.primaryColor || activePreset.primary;
    const secondaryColor = config?.branding?.secondaryColor || activePreset.secondary;
    const fontFamily = config?.branding?.fontFamily || activePreset.font;

    const currentPageUrl = activePage?.slug === 'index' 
        ? publicUrl 
        : `${publicUrl}/${activePage?.slug}`;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar: Section Library & Theme Settings */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
                <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Layout className="text-blue-600 animate-pulse" style={{ color: 'var(--color-primary)' }} />
                                Page Builder
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Configure and design your site</p>
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

                    {/* Page Selector & Manager */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Page</span>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => {
                                        setShowNewPageForm(!showNewPageForm);
                                        setNewPageTitle('');
                                        setNewPageSlug('');
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors"
                                    title="Create New Page"
                                >
                                    <Plus size={16} />
                                </button>
                                {activePage && activePage.slug !== 'index' && (
                                    <button 
                                        onClick={() => onDeletePage(activePage._id)}
                                        className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete Page"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {showNewPageForm ? (
                            <div className="space-y-3 bg-white p-3 border border-slate-200 rounded-xl animate-in fade-in duration-200">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Page Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Admissions"
                                        value={newPageTitle}
                                        onChange={(e) => {
                                            setNewPageTitle(e.target.value);
                                            setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                        }}
                                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Page Slug</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. admissions"
                                        value={newPageSlug}
                                        onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button 
                                        onClick={() => {
                                            if (!newPageTitle || !newPageSlug) {
                                                toast.error("Please enter title and slug");
                                                return;
                                            }
                                            onCreatePage(newPageTitle, newPageSlug);
                                            setShowNewPageForm(false);
                                        }}
                                        className="flex-1 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all"
                                        style={{ backgroundColor: 'var(--color-primary)' }}
                                    >
                                        Create
                                    </button>
                                    <button 
                                        onClick={() => setShowNewPageForm(false)}
                                        className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <select
                                value={activePage?.slug || 'index'}
                                onChange={(e) => {
                                    const page = pages.find(p => p.slug === e.target.value);
                                    if (page) onSwitchPage(page);
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-slate-400 bg-white cursor-pointer font-bold text-slate-700"
                            >
                                {pages.map(p => (
                                    <option key={p.slug} value={p.slug}>
                                        {p.title} ({p.slug === 'index' ? 'Home' : p.slug})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('sections')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'sections' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
                        >
                            Blocks
                        </button>
                        <button
                            onClick={() => setActiveTab('page-seo')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'page-seo' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
                        >
                            Page SEO
                        </button>
                        <button
                            onClick={() => setActiveTab('theme')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'theme' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
                        >
                            Site Theme
                        </button>
                    </div>

                    {/* Share / Preview Card */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Globe size={10} />
                                Public Link
                            </span>
                            <a 
                                href={currentPageUrl} 
                                target="_blank" 
                                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                style={{ color: 'var(--color-primary)' }}
                            >
                                Visit Site <ExternalLink size={10} />
                            </a>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 group">
                            <div className="flex-1 text-[10px] font-medium text-slate-500 truncate">
                                {currentPageUrl}
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(currentPageUrl);
                                    toast.success("Link copied to clipboard!");
                                }}
                                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Copy Link"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'sections' && (
                        <div className="space-y-3">
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
                                        <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Block</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'page-seo' && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Page Metadata</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-600">Page Navigation Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Home, About Us"
                                            value={pageTitle}
                                            onChange={(e) => setPageTitle(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-600">URL Route Slug</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. home, about-us"
                                            value={pageSlugInput}
                                            disabled={activePage?.slug === 'index'}
                                            onChange={(e) => setPageSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-60"
                                        />
                                        {activePage?.slug === 'index' && (
                                            <p className="text-[9px] text-slate-400">Main landing page slug is fixed to index.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">SEO Meta Tags</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-slate-600">SEO Page Title</label>
                                            <span className={`text-[9px] font-bold ${seoTitle.length > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {seoTitle.length}/60 chars
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g. St. Ann's High School - About Our Campus"
                                            value={seoTitle}
                                            onChange={(e) => setSeoTitle(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-slate-600">SEO Description</label>
                                            <span className={`text-[9px] font-bold ${seoDescription.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {seoDescription.length}/160 chars
                                            </span>
                                        </div>
                                        <textarea
                                            placeholder="A short summary of this page for search results."
                                            value={seoDescription}
                                            onChange={(e) => setSeoDescription(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 h-24 resize-none focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-600">SEO Keywords (Comma Separated)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. admissions, st anns, school, st. anns hyderabad"
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="space-y-6">
                            {/* Preset Themes */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presets</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(THEME_PRESETS).map((presetName) => (
                                        <button
                                            key={presetName}
                                            onClick={() => handleApplyPreset(presetName)}
                                            className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${config?.theme?.preset === presetName ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <span className="text-xs font-bold capitalize text-slate-700">{presetName}</span>
                                            <div className="flex gap-1">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: THEME_PRESETS[presetName].primary }} />
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: THEME_PRESETS[presetName].secondary }} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Custom Colors */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Colors</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-600">Primary Color</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={primaryColor} 
                                                onChange={(e) => handleUpdateConfig({ branding: { primaryColor: e.target.value } })}
                                                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden" 
                                            />
                                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">{primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-600">Secondary Color</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={secondaryColor} 
                                                onChange={(e) => handleUpdateConfig({ branding: { secondaryColor: e.target.value } })}
                                                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden" 
                                            />
                                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">{secondaryColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Custom Typography */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-semibold">Typography</h3>
                                <div className="flex flex-col gap-2">
                                    {['Inter', 'Merriweather', 'Outfit', 'DM Sans', 'Space Grotesk'].map((font) => (
                                        <button
                                            key={font}
                                            onClick={() => handleUpdateConfig({ branding: { fontFamily: font } })}
                                            className={`p-3 text-xs font-bold text-left rounded-xl border transition-all ${fontFamily === font ? 'border-slate-900 bg-slate-55 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}
                                            style={{ fontFamily: font }}
                                        >
                                            {font} (Sample Text)
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* SEO Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-bold">Global Default SEO (Fallback)</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Global Fallback Title</label>
                                        <input
                                            type="text"
                                            placeholder="School Name - Official Website"
                                            value={config?.settings?.seoTitle || ''}
                                            onChange={(e) => handleUpdateConfig({ settings: { seoTitle: e.target.value } })}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Global Fallback Description</label>
                                        <textarea
                                            placeholder="Fallback description of the school for Google search."
                                            value={config?.settings?.seoDescription || ''}
                                            onChange={(e) => handleUpdateConfig({ settings: { seoDescription: e.target.value } })}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 h-20 resize-none focus:outline-none focus:border-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                    {isConfigSaving && (
                        <div className="text-[10px] font-bold text-amber-600 text-center flex items-center justify-center gap-1 animate-pulse mb-1">
                            Saving theme & configurations...
                        </div>
                    )}
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-50 transition-all"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                        {isSaving ? "Saving Content..." : "Save Page Content"}
                        <Save size={18} />
                    </button>
                </div>
            </div>

            {/* Main Canvas */}
            <div 
                id="website-canvas" 
                className="flex-1 overflow-y-auto bg-slate-100/50 p-12 transition-all duration-300"
                style={{
                    '--color-primary': primaryColor,
                    '--color-secondary': secondaryColor,
                    '--font-family': fontFamily,
                    fontFamily: `'${fontFamily}', sans-serif`
                }}
            >
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
                        <Reorder.Group 
                            values={sections} 
                            onReorder={setSections} 
                            className="space-y-0"
                        >
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
                                    preset={config?.theme?.preset || 'modern'}
                                />
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DragDropEditor;
