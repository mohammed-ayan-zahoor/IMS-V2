"use client";

import React, { useState, useEffect } from 'react';
import DragDropEditor from '@/components/website/builder/DragDropEditor';
import { getTemplateSections } from '@/services/pageBuilderService';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

export default function WebsiteAdminPage() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [pages, setPages] = useState([]);
    const [activePage, setActivePage] = useState(null);
    const toast = useToast();

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch config and home page
                const res = await fetch('/api/v1/website/config');
                const data = await res.json();
                
                if (res.ok) {
                    setConfig(data.config);
                    // For now, let's just initialize a default home page if none exists
                    if (!data.pages || data.pages.length === 0) {
                        const defaultSections = getTemplateSections(data.config?.template || 'SCHOOL');
                        setActivePage({
                            title: 'Home',
                            slug: 'index',
                            sections: defaultSections
                        });
                    } else {
                        setPages(data.pages);
                        setActivePage(data.pages[0]);
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

    const handleSave = async (sections) => {
        try {
            const res = await fetch('/api/v1/website/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...activePage,
                    sections
                })
            });
            
            if (res.ok) {
                toast.success("Website updated successfully");
            } else {
                toast.error("Failed to save website");
            }
        } catch (error) {
            toast.error("Error saving website");
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden">
            <DragDropEditor 
                initialSections={activePage?.sections || []} 
                onSave={handleSave} 
                instituteId={config?.instituteId}
                pageSlug={activePage?.slug}
            />
        </div>
    );
}
