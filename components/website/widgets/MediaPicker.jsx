"use client";

import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Loader2, Search } from 'lucide-react';
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const MediaPicker = ({ onSelect, onClose, currentUrl }) => {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const toast = useToast();

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            const res = await fetch('/api/v1/website/media');
            const data = await res.json();
            if (res.ok) setMedia(data.media);
        } catch (error) {
            toast.error("Failed to load media library");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "website-media");

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Image uploaded");
                fetchMedia();
                onSelect(data.url);
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            toast.error("Error uploading image");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Delete this image?")) return;

        try {
            const res = await fetch(`/api/v1/website/media?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMedia(prev => prev.filter(m => m._id !== id));
                toast.success("Image deleted");
            }
        } catch (error) {
            toast.error("Failed to delete image");
        }
    };

    const filteredMedia = media.filter(m => 
        (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.url || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                            <ImageIcon className="text-blue-600" />
                            Media Library
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Select an image or upload a new one</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-6 border-b border-slate-100 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            placeholder="Search images..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 px-6 py-3 bg-premium-blue text-white rounded-2xl font-bold cursor-pointer hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                        {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                        {uploading ? "Uploading..." : "Upload New"}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="animate-spin mb-4" size={40} />
                            <p>Loading library...</p>
                        </div>
                    ) : filteredMedia.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px]">
                            <ImageIcon size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">No images found</p>
                            <p className="text-sm">Upload your first image to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {filteredMedia.map((item) => (
                                <div 
                                    key={item._id}
                                    onClick={() => onSelect(item.url)}
                                    className={cn(
                                        "group relative aspect-square rounded-3xl overflow-hidden cursor-pointer border-4 transition-all duration-300",
                                        currentUrl === item.url ? "border-blue-500 scale-95 shadow-xl shadow-blue-500/20" : "border-transparent hover:border-slate-200"
                                    )}
                                >
                                    <img 
                                        src={item.url} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button 
                                            onClick={(e) => handleDelete(e, item._id)}
                                            className="p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-colors shadow-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaPicker;
