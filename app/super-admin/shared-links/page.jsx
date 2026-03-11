"use client";

import { useState, useEffect } from "react";
import { 
    Share2, 
    Plus, 
    Copy, 
    Trash2, 
    ExternalLink, 
    Check, 
    X,
    Building2,
    Users,
    MessageSquare,
    Power
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

// Swiss Minimalist Sharp Components
const SharpCard = ({ children, className = "" }) => (
    <div className={`bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}>
        {children}
    </div>
);

const SharpButton = ({ children, onClick, variant = "primary", className = "", disabled = false }) => {
    const variants = {
        primary: "bg-emerald-600 text-white hover:bg-emerald-700",
        secondary: "bg-white text-black border-2 border-black hover:bg-gray-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "bg-transparent text-black hover:bg-gray-100"
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 font-black uppercase tracking-widest text-xs transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            style={{ boxShadow: !disabled ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none' }}
        >
            {children}
        </button>
    );
};

export default function SharedLinksPage() {
    const toast = useToast();
    const [links, setLinks] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    
    // Form State
    const [newLinkName, setNewLinkName] = useState("");
    const [selectedInstitutes, setSelectedInstitutes] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [linksRes, instRes] = await Promise.all([
                    fetch("/api/v1/shared-links"),
                    fetch("/api/v1/institutes")
                ]);
                
                const linksData = await linksRes.json();
                const instData = await instRes.json();
                
                setLinks(linksData.links || []);
                setInstitutes(instData.institutes || []);
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateLink = async () => {
        if (!newLinkName || selectedInstitutes.length === 0) {
            toast.error("Please provide a name and select at least one institute");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/v1/shared-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newLinkName,
                    institutes: selectedInstitutes
                })
            });

            if (!res.ok) throw new Error("Failed to generate link");
            
            const data = await res.json();
            setLinks([data.link, ...links]);
            setNewLinkName("");
            setSelectedInstitutes([]);
            toast.success("Shared dashboard generated!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (link) => {
        try {
            const res = await fetch(`/api/v1/shared-links/${link._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !link.isActive })
            });
            
            if (!res.ok) throw new Error("Update failed");
            
            setLinks(links.map(l => l._id === link._id ? { ...l, isActive: !l.isActive } : l));
            toast.success(`Dashboard ${!link.isActive ? 'Activated' : 'Disabled'}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this link?")) return;
        
        try {
            const res = await fetch(`/api/v1/shared-links/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            setLinks(links.filter(l => l._id !== id));
            toast.success("Link deleted");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const copyToClipboard = (slug) => {
        const url = `${window.location.origin}/public/dashboard/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
    };

    if (loading) return <div className="p-8 text-center font-black animate-pulse">LOADING_SYSTEM_RESOURCES...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header section with massive typography */}
            <header className="space-y-2">
                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                    Shared <span className="text-emerald-600">Access</span>
                </h1>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">
                    Generate unique endpoints for multi-institutional fee auditing.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                {/* Generation Panel */}
                <SharpCard className="p-8 space-y-8 lg:sticky lg:top-24">
                    <div className="space-y-1">
                        <h2 className="font-black uppercase text-xl">New Generator</h2>
                        <div className="h-1 w-12 bg-black" />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dashboard Name</label>
                            <input 
                                type="text" 
                                placeholder="E.G. Q1 RECOVERY DRIVE"
                                value={newLinkName}
                                onChange={(e) => setNewLinkName(e.target.value)}
                                className="w-full border-2 border-black p-3 font-bold uppercase text-sm focus:outline-none focus:bg-gray-50"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Institutes</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {institutes.map(inst => (
                                    <div 
                                        key={inst._id}
                                        onClick={() => {
                                            if (selectedInstitutes.includes(inst._id)) {
                                                setSelectedInstitutes(selectedInstitutes.filter(id => id !== inst._id));
                                            } else {
                                                setSelectedInstitutes([...selectedInstitutes, inst._id]);
                                            }
                                        }}
                                        className={`p-3 border-2 cursor-pointer transition-all flex items-center justify-between ${
                                            selectedInstitutes.includes(inst._id) 
                                            ? 'border-emerald-600 bg-emerald-50' 
                                            : 'border-gray-100 hover:border-black'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Building2 size={16} className={selectedInstitutes.includes(inst._id) ? 'text-emerald-600' : 'text-gray-300'} />
                                            <span className="font-black text-[10px] uppercase truncate max-w-[150px]">{inst.name}</span>
                                        </div>
                                        {selectedInstitutes.includes(inst._id) && <Check size={14} className="text-emerald-600" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <SharpButton 
                            className="w-full py-4 text-sm"
                            onClick={handleCreateLink}
                            disabled={creating || !newLinkName || selectedInstitutes.length === 0}
                        >
                            {creating ? "GENERATING..." : "GENERATE LINK"}
                        </SharpButton>
                    </div>
                </SharpCard>

                {/* Listing Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <h2 className="font-black uppercase text-xl">Active Endpoints</h2>
                        <span className="bg-black text-white px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                            {links.length} TOTAL
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <AnimatePresence mode="popLayout">
                            {links.length === 0 ? (
                                <div className="py-20 text-center border-2 border-dashed border-gray-200">
                                    <p className="font-black text-gray-300 uppercase tracking-widest text-xs">No active links generated yet.</p>
                                </div>
                            ) : (
                                links.map(link => (
                                    <motion.div
                                        key={link._id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <SharpCard className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${!link.isActive ? 'opacity-50 grayscale' : ''}`}>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black uppercase text-lg">{link.name}</h3>
                                                        {!link.isActive && <span className="bg-red-600 text-white px-2 py-0.5 text-[8px] font-black uppercase">Terminated</span>}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 font-mono tracking-tight">{link.slug}</p>
                                                </div>

                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 size={12} className="text-gray-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{link.institutes?.length || 0} Institutes</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users size={12} className="text-gray-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{link.visitors?.length || 0} Visits</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquare size={12} className="text-gray-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{link.comments?.length || 0} Comments</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <SharpButton 
                                                    variant="secondary" 
                                                    onClick={() => copyToClipboard(link.slug)}
                                                    className="p-3"
                                                >
                                                    <Copy size={16} />
                                                </SharpButton>
                                                
                                                <a 
                                                    href={`/public/dashboard/${link.slug}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                >
                                                    <SharpButton variant="secondary" className="p-3">
                                                        <ExternalLink size={16} />
                                                    </SharpButton>
                                                </a>

                                                <SharpButton 
                                                    variant={link.isActive ? "secondary" : "primary"} 
                                                    onClick={() => toggleStatus(link)}
                                                    className="p-3"
                                                >
                                                    <Power size={16} />
                                                </SharpButton>

                                                <SharpButton 
                                                    variant="danger" 
                                                    onClick={() => handleDelete(link._id)}
                                                    className="p-3 shadow-none"
                                                >
                                                    <Trash2 size={16} />
                                                </SharpButton>
                                            </div>
                                        </SharpCard>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #000;
                }
            `}</style>
        </div>
    );
}
