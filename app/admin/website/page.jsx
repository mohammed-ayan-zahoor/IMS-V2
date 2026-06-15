"use client";

import React, { useState, useEffect } from 'react';
import GrapesEditor from '@/components/website/builder/GrapesEditor';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

export default function WebsiteAdminPage() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [pages, setPages] = useState([]);
    const [activePage, setActivePage] = useState(null);
    const [instituteCode, setInstituteCode] = useState('');
    const toast = useToast();

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/v1/website/pages');
            const data = await res.json();
            if (res.ok) {
                setPages(data.pages || []);
            }
        } catch (error) {
            console.error("Fetch Pages Error:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/v1/website/config');
                const data = await res.json();

                if (res.ok) {
                    setConfig(data.config);
                    setInstituteCode(data.instituteCode);
                    if (!data.pages || data.pages.length === 0) {
                        // New site — create a blank home page shell
                        const homePage = {
                            title: 'Home',
                            slug: 'index',
                            sections: []
                        };
                        setActivePage(homePage);
                        setPages([homePage]);
                    } else {
                        setPages(data.pages);
                        setActivePage(data.pages.find(p => p.slug === 'index') || data.pages[0]);
                    }
                }
            } catch (error) {
                console.error("Website Init Error:", error);
                toast.error("Failed to load website configuration");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSave = async (gjsContent, pageDetails = {}) => {
        try {
            const res = await fetch('/api/v1/website/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...activePage,
                    ...pageDetails,
                    sections: gjsContent, // store GrapesJS data in sections field
                })
            });

            const data = await res.json();
            if (res.ok) {
                await fetchPages();
                if (data.page) {
                    setActivePage(data.page);
                }
            } else {
                toast.error(data.error || "Failed to save website");
            }
        } catch (error) {
            toast.error("Error saving website");
        }
    };

    const handleCreatePage = async (title, slug) => {
        try {
            const res = await fetch('/api/v1/website/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slug, sections: [] })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("New page created!");
                setPages(prev => [...prev, data.page]);
                setActivePage(data.page);
            } else {
                toast.error(data.error || "Failed to create page");
            }
        } catch (error) {
            toast.error("Error creating page");
        }
    };

    const handleDeletePage = async (pageId) => {
        if (!confirm("Delete this page? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/v1/website/pages?id=${pageId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Page deleted");
                setPages(prev => {
                    const filtered = prev.filter(p => p._id !== pageId);
                    setActivePage(filtered.find(p => p.slug === 'index') || filtered[0] || null);
                    return filtered;
                });
            } else {
                toast.error("Failed to delete page");
            }
        } catch (error) {
            toast.error("Error deleting page");
        }
    };

    const handleSwitchPage = (page) => {
        setActivePage(page);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={36} />
                    <span className="text-slate-400 text-sm font-medium">Loading Website Builder…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden">
            <GrapesEditor
                initialSections={activePage?.draftContent || activePage?.liveContent || activePage?.sections || []}
                onSave={handleSave}
                instituteCode={instituteCode}
                pageSlug={activePage?.slug}
                initialConfig={config}
                pages={pages}
                activePage={activePage}
                onCreatePage={handleCreatePage}
                onDeletePage={handleDeletePage}
                onSwitchPage={handleSwitchPage}
            />
        </div>
    );
}
