"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Edit, Trash2, Loader2, Star, Upload, X, GripVertical, Eye, Type, Hash, Calendar, BookOpen, Move, ZoomIn, ZoomOut, Maximize2, Minimize2, Maximize } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const PLACEHOLDER_META = {
    studentName: { label: "Student Name", icon: Type, color: "#f59e0b", sample: "John Doe" },
    courseName: { label: "Course Name", icon: BookOpen, color: "#3b82f6", sample: "B.Tech CS" },
    issueDate: { label: "Issue Date", icon: Calendar, color: "#10b981", sample: "19 Apr 2026" },
    certificateNumber: { label: "Certificate No.", icon: Hash, color: "#8b5cf6", sample: "CERT-0001" }
};

// ─── Draggable Placeholder on Canvas ────────────────────────────────────────
function DraggablePlaceholder({ id, placeholder, meta, containerRef, onDrag, isSelected, onSelect, zoom }) {
    const elRef = useRef(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        onSelect(id);

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const elRect = elRef.current?.getBoundingClientRect();
        if (!elRect) return;

        offset.current = {
            x: e.clientX - elRect.left - elRect.width / 2,
            y: e.clientY - elRect.top - elRect.height / 2
        };

        const handlePointerMove = (moveEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            // Adjust coordinates for zoom level
            const relX = (moveEvent.clientX - containerRect.left - offset.current.x) * (100 / zoom);
            const relY = (moveEvent.clientY - containerRect.top - offset.current.y) * (100 / zoom);

            const pctX = Math.max(2, Math.min(98, (relX / containerRect.width) * 100));
            const pctY = Math.max(2, Math.min(98, (relY / containerRect.height) * 100));

            onDrag(id, Math.round(pctX), Math.round(pctY));
        };

        const handlePointerUp = () => {
            isDragging.current = false;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }, [id, containerRef, onDrag, onSelect, zoom]);

    if (!placeholder.enabled) return null;

    const fontSize = placeholder.fontSize || 16;
    const fontWeight = placeholder.fontWeight || "normal";
    const fontStyle = placeholder.fontStyle || "normal";
    const color = placeholder.color || "#000000";
    const textAlign = placeholder.textAlign || "center";

    return (
        <div
            ref={elRef}
            onPointerDown={handlePointerDown}
            className={cn(
                "absolute flex items-center justify-center px-3 py-2 rounded-md cursor-grab active:cursor-grabbing select-none touch-none transition-all",
                isSelected
                    ? "ring-2 ring-white shadow-lg z-20 scale-105"
                    : "z-10 hover:scale-105"
            )}
            style={{
                left: `${placeholder.x}%`,
                top: `${placeholder.y}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: isSelected ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.15)",
            }}
        >
            <span
                className="font-medium whitespace-nowrap"
                style={{
                    fontSize: `${Math.max(10, fontSize * 0.6)}px`,
                    fontWeight: fontWeight,
                    fontStyle: fontStyle,
                    color: color,
                    textAlign: textAlign,
                }}
            >
                {meta.sample}
            </span>
        </div>
    );
}

// ─── Style Panel Component ──────────────────────────────────────────────────
function StylePanel({ selectedPlaceholder, placeholder, meta, onChange }) {
    if (!selectedPlaceholder || !placeholder?.enabled) return null;

    const fontSize = placeholder.fontSize || 16;
    const fontWeight = placeholder.fontWeight || "normal";
    const fontStyle = placeholder.fontStyle || "normal";
    const color = placeholder.color || "#000000";
    const textAlign = placeholder.textAlign || "center";

    return (
        <div className="w-80 bg-slate-50 border-l border-slate-200 p-6 space-y-6 overflow-y-auto">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: meta.color }}
                    />
                    <h3 className="font-bold text-slate-900 text-sm">Style Settings</h3>
                </div>
                <p className="text-xs text-slate-500">{meta.label}</p>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Font Family</label>
                <select
                    value={placeholder.fontFamily || "Roboto"}
                    onChange={(e) => onChange("fontFamily", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-premium-blue focus:ring-2 focus:ring-premium-blue/20 outline-none transition-all"
                >
                    <option value="Roboto">Roboto</option>
                    <option value="Inter">Inter</option>
                    <option value="Lora">Lora</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Courgette">Courgette</option>
                    <option value="Silentha OT">Silentha OT</option>
                    <option value="Roherat">Roherat</option>
                    <option value="Signtelly">Signtelly</option>
                    <option value="Arial">Arial</option>
                </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Font Size</label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="12"
                        max="72"
                        value={fontSize}
                        onChange={(e) => onChange("fontSize", parseInt(e.target.value))}
                        className="flex-1 h-2 accent-premium-blue rounded-lg"
                    />
                    <input
                        type="number"
                        min="12"
                        max="72"
                        value={fontSize}
                        onChange={(e) => onChange("fontSize", parseInt(e.target.value) || 16)}
                        className="w-12 px-2 py-1 rounded-lg border border-slate-200 text-xs text-center font-medium"
                    />
                    <span className="text-xs text-slate-400">px</span>
                </div>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Font Weight</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange("fontWeight", "normal")}
                        className={cn(
                            "flex-1 py-2 rounded-lg font-medium text-sm transition-all border",
                            fontWeight === "normal"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Normal
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange("fontWeight", "bold")}
                        className={cn(
                            "flex-1 py-2 rounded-lg font-bold text-sm transition-all border",
                            fontWeight === "bold"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Bold
                    </button>
                </div>
            </div>

            {/* Font Style */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Font Style</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange("fontStyle", "normal")}
                        className={cn(
                            "flex-1 py-2 rounded-lg font-medium text-sm transition-all border",
                            fontStyle === "normal"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Normal
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange("fontStyle", "italic")}
                        className={cn(
                            "flex-1 py-2 rounded-lg italic text-sm transition-all border",
                            fontStyle === "italic"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Italic
                    </button>
                </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color</label>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => onChange("color", e.target.value)}
                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => onChange("color", e.target.value)}
                        placeholder="#000000"
                        maxLength="7"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-medium focus:border-premium-blue focus:ring-2 focus:ring-premium-blue/20 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Text Alignment</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange("textAlign", "left")}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-sm transition-all border",
                            textAlign === "left"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Left
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange("textAlign", "center")}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-sm transition-all border",
                            textAlign === "center"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Center
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange("textAlign", "right")}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-sm transition-all border",
                            textAlign === "right"
                                ? "bg-premium-blue text-white border-premium-blue"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Right
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CertificateTemplateManager() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [imageLoadError, setImageLoadError] = useState(false);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    // Editor state
    const [form, setForm] = useState({
        name: "",
        templateImage: null,
        imageUrl: "",
        placeholders: {
            studentName: { x: 50, y: 45, enabled: true, fontSize: 24, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
            courseName: { x: 50, y: 55, enabled: true, fontSize: 18, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
            issueDate: { x: 50, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
            certificateNumber: { x: 85, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" }
        },
        isDefault: false
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/v1/certificate-templates");
            if (res.ok) {
                const data = await res.json();
                setTemplates((data.data || []).filter(t => !t.htmlTemplate));
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "certificate-template");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setImageLoadError(false);
                setForm(prev => ({
                    ...prev,
                    templateImage: file,
                    imageUrl: data.url
                }));
                toast.success("Image uploaded successfully");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveTemplate = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error("Template name is required");
            return;
        }

        if (!form.imageUrl) {
            toast.error("Please upload a template image");
            return;
        }

        try {
            const method = editingId ? "PUT" : "POST";
            const url = editingId
                ? `/api/v1/certificate-templates/${editingId}`
                : "/api/v1/certificate-templates";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    type: "CUSTOM",
                    imageUrl: form.imageUrl,
                    placeholders: form.placeholders,
                    isDefault: form.isDefault
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(editingId ? "Template updated successfully" : "Template created successfully");
                fetchTemplates();
                resetForm();
                setShowEditor(false);
            } else {
                toast.error(data.error || "Failed to save template");
            }
        } catch (error) {
            console.error("Error saving template:", error);
            toast.error("Failed to save template");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            const res = await fetch(`/api/v1/certificate-templates/${id}`, {
                method: "DELETE"
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Template deleted successfully");
                fetchTemplates();
            } else {
                toast.error(data.error || "Failed to delete template");
            }
        } catch (error) {
            console.error("Error deleting template:", error);
            toast.error("Failed to delete template");
        }
    };

    const handleSetDefault = async (id) => {
        try {
            const res = await fetch(`/api/v1/certificate-templates/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Default template set successfully");
                fetchTemplates();
            } else {
                toast.error(data.error || "Failed to set default template");
            }
        } catch (error) {
            console.error("Error setting default template:", error);
            toast.error("Failed to set default template");
        }
    };

    const handleEditTemplate = (template) => {
        setEditingId(template._id);
        setImageLoadError(false);
        setForm({
            name: template.name,
            templateImage: null,
            imageUrl: template.imageUrl || template.styles?.backgroundImage || "",
            placeholders: template.placeholders || {
                studentName: { x: 50, y: 45, enabled: true, fontSize: 24, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                courseName: { x: 50, y: 55, enabled: true, fontSize: 18, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                issueDate: { x: 50, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                certificateNumber: { x: 85, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" }
            },
            isDefault: template.isDefault
        });
        setShowEditor(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedPlaceholder(null);
        setZoom(100);
        setImageLoadError(false);
        setForm({
            name: "",
            templateImage: null,
            imageUrl: "",
            placeholders: {
                studentName: { x: 50, y: 45, enabled: true, fontSize: 24, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                courseName: { x: 50, y: 55, enabled: true, fontSize: 18, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                issueDate: { x: 50, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" },
                certificateNumber: { x: 85, y: 85, enabled: true, fontSize: 14, fontWeight: "normal", fontStyle: "normal", color: "#000000", textAlign: "center" }
            },
            isDefault: false
        });
    };

    // ─── Zoom Control Functions ───────────────────────────────────────────
    const handleZoomChange = useCallback((newZoom) => {
        setZoom(Math.max(50, Math.min(200, newZoom)));
    }, []);

    const handleZoomIn = useCallback(() => {
        handleZoomChange(zoom + 10);
    }, [zoom, handleZoomChange]);

    const handleZoomOut = useCallback(() => {
        handleZoomChange(zoom - 10);
    }, [zoom, handleZoomChange]);

    const handleFitToView = useCallback(() => {
        if (!canvasContainerRef.current || !canvasRef.current) return;

        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const img = canvasRef.current.querySelector('img');
        
        if (!img) return;

        const containerWidth = containerRect.width - 32; // Account for padding
        const containerHeight = containerRect.height - 32;
        const imageWidth = img.naturalWidth || img.width;
        const imageHeight = img.naturalHeight || img.height;

        if (imageWidth && imageHeight) {
            const zoomByWidth = (containerWidth / imageWidth) * 100;
            const zoomByHeight = (containerHeight / imageHeight) * 100;
            const fitZoom = Math.min(zoomByWidth, zoomByHeight, 200);
            handleZoomChange(Math.max(50, fitZoom));
        }
    }, [handleZoomChange]);

    // ─── Ctrl+Scroll Zoom Handler ─────────────────────────────────────────
    const handleCanvasWheel = useCallback((e) => {
        if (!e.ctrlKey && !e.metaKey) return; // Meta key for Mac

        e.preventDefault();
        e.stopPropagation();

        const direction = e.deltaY > 0 ? -1 : 1; // Invert: wheel down = zoom out
        handleZoomChange(zoom + direction * 10);
    }, [zoom, handleZoomChange]);

    const handlePlaceholderChange = (key, field, value) => {
        setForm(prev => ({
            ...prev,
            placeholders: {
                ...prev.placeholders,
                [key]: {
                    ...prev.placeholders[key],
                    [field]: value
                }
            }
        }));
    };

    const handlePlaceholderStyleChange = (key, field, value) => {
        setForm(prev => ({
            ...prev,
            placeholders: {
                ...prev.placeholders,
                [key]: {
                    ...prev.placeholders[key],
                    [field]: value
                }
            }
        }));
    };

    const handleDrag = useCallback((key, x, y) => {
        setForm(prev => ({
            ...prev,
            placeholders: {
                ...prev.placeholders,
                [key]: {
                    ...prev.placeholders[key],
                    x,
                    y
                }
            }
        }));
    }, []);

    // Nudge with arrow keys
    useEffect(() => {
        if (!showEditor || !selectedPlaceholder) return;

        const handleKeyDown = (e) => {
            const step = e.shiftKey ? 5 : 1;
            const p = form.placeholders[selectedPlaceholder];
            if (!p?.enabled) return;

            let newX = p.x;
            let newY = p.y;

            switch (e.key) {
                case "ArrowLeft": newX = Math.max(0, p.x - step); break;
                case "ArrowRight": newX = Math.min(100, p.x + step); break;
                case "ArrowUp": newY = Math.max(0, p.y - step); break;
                case "ArrowDown": newY = Math.min(100, p.y + step); break;
                default: return;
            }

            e.preventDefault();
            handleDrag(selectedPlaceholder, newX, newY);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showEditor, selectedPlaceholder, form.placeholders, handleDrag]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-premium-blue" size={32} />
            </div>
        );
    }

    return (
        <Card>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Certificate Templates</h3>
                        <p className="text-xs text-slate-500 mt-1">Upload certificate design images and position placeholders</p>
                    </div>
                    {!showEditor && (
                        <Button
                            type="button"
                            onClick={() => setShowEditor(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus size={16} /> New Template
                        </Button>
                    )}
                </div>

                {/* Templates List or Editor */}
                {showEditor ? (
                    <div className={cn(
                        "space-y-0 border-t pt-6 transition-all",
                        isFullscreen && "fixed inset-0 z-50 bg-white p-6 overflow-auto border-t-0 pt-0"
                    )}>
                        {/* Editor Header Bar */}
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-30 py-3 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <h4 className="font-bold text-slate-900 text-lg">
                                    {editingId ? "Edit Template" : "Create New Template"}
                                </h4>
                                <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-full">
                                    <Move size={10} />
                                    Drag placeholders on canvas • Arrow keys for fine-tuning
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen editor"}
                                >
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditor(false);
                                        setIsFullscreen(false);
                                        resetForm();
                                    }}
                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Main Editor Layout: Sidebar + Canvas + Style Panel */}
                        <div className={cn(
                            "flex gap-6",
                            isFullscreen ? "flex-row h-[calc(100vh-120px)]" : "flex-col lg:flex-row"
                        )}>
                            {/* ─── Left Sidebar/Controls ─── */}
                            <div className={cn(
                                "space-y-4 shrink-0",
                                isFullscreen ? "w-72 overflow-y-auto pr-2" : "w-full lg:w-72"
                            )}>
                                {/* Template Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g., Modern Certificate"
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all text-sm font-medium"
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Design Image</label>
                                    <div
                                        onClick={() => !uploadingImage && fileInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                                            form.imageUrl
                                                ? "border-emerald-300 bg-emerald-50/50 hover:border-emerald-400"
                                                : "border-slate-300 hover:border-premium-blue hover:bg-premium-blue/5"
                                        )}
                                    >
                                        {uploadingImage ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="animate-spin text-premium-blue" size={18} />
                                                <p className="text-sm text-slate-500 font-medium">Uploading...</p>
                                            </div>
                                        ) : form.imageUrl ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <Eye size={18} className="text-emerald-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-emerald-700">Image uploaded</p>
                                                    <p className="text-[10px] text-slate-400">Click to replace</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 py-2">
                                                <Upload size={20} className="text-slate-400" />
                                                <p className="text-xs font-bold text-slate-600">Upload Image</p>
                                                <p className="text-[10px] text-slate-400">PNG/JPG, max 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </div>

                                {/* Placeholder Toggle Cards */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Placeholders</label>
                                    <div className="space-y-1.5">
                                        {Object.entries(form.placeholders).map(([key, placeholder]) => {
                                             const meta = PLACEHOLDER_META[key];
                                             // Skip placeholders without metadata
                                             if (!meta) return null;
                                             const Icon = meta.icon;
                                             const isSelected = selectedPlaceholder === key;

                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => {
                                                        if (placeholder.enabled) setSelectedPlaceholder(key);
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group",
                                                        isSelected
                                                            ? "border-slate-300 bg-slate-50 shadow-sm"
                                                            : "border-transparent hover:border-slate-200 hover:bg-slate-50/50"
                                                    )}
                                                >
                                                    {/* Enable Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePlaceholderChange(key, "enabled", !placeholder.enabled);
                                                            if (!placeholder.enabled) setSelectedPlaceholder(key);
                                                            else if (isSelected) setSelectedPlaceholder(null);
                                                        }}
                                                        className={cn(
                                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                            placeholder.enabled
                                                                ? "border-transparent"
                                                                : "border-slate-300 bg-white"
                                                        )}
                                                        style={placeholder.enabled ? { backgroundColor: meta.color } : {}}
                                                    >
                                                        {placeholder.enabled && (
                                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                                <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Label */}
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Icon size={13} className={placeholder.enabled ? "text-slate-600" : "text-slate-300"} />
                                                        <span className={cn(
                                                            "text-xs font-bold truncate",
                                                            placeholder.enabled ? "text-slate-700" : "text-slate-300"
                                                        )}>
                                                            {meta.label}
                                                        </span>
                                                    </div>

                                                    {/* Coords */}
                                                    {placeholder.enabled && (
                                                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                            {placeholder.x},{placeholder.y}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fine-tune Controls for Selected */}
                                {selectedPlaceholder && form.placeholders[selectedPlaceholder]?.enabled && (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-sm"
                                                style={{ backgroundColor: PLACEHOLDER_META[selectedPlaceholder].color }}
                                            />
                                            <span className="text-xs font-bold text-slate-700">
                                                {PLACEHOLDER_META[selectedPlaceholder].label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">X Position</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={form.placeholders[selectedPlaceholder].x}
                                                        onChange={e => handlePlaceholderChange(selectedPlaceholder, "x", parseInt(e.target.value))}
                                                        className="flex-1 h-1.5 accent-slate-600"
                                                    />
                                                    <span className="text-[10px] text-slate-500 font-mono w-7 text-right">{form.placeholders[selectedPlaceholder].x}%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Y Position</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={form.placeholders[selectedPlaceholder].y}
                                                        onChange={e => handlePlaceholderChange(selectedPlaceholder, "y", parseInt(e.target.value))}
                                                        className="flex-1 h-1.5 accent-slate-600"
                                                    />
                                                    <span className="text-[10px] text-slate-500 font-mono w-7 text-right">{form.placeholders[selectedPlaceholder].y}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                            <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[8px]">↑↓←→</span>
                                            Nudge 1% • Hold Shift for 5%
                                        </p>
                                    </div>
                                )}



                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveTemplate}
                                        className="flex-1 px-4 py-2.5 bg-premium-blue text-white font-bold rounded-xl hover:bg-premium-blue/90 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        {editingId ? "Update" : "Create"} Template
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditor(false);
                                            setIsFullscreen(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            {/* ─── Center: Canvas Preview + Right: Style Panel ─── */}
                            <div className="flex flex-1 min-w-0 gap-0 flex-col">
                                {form.imageUrl && (
                                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 rounded-t-2xl">
                                        {/* Zoom Controls Toolbar */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleZoomOut}
                                                disabled={zoom <= 50}
                                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                title="Zoom out (Ctrl+Scroll)"
                                            >
                                                <ZoomOut size={16} />
                                            </button>

                                            <input
                                                type="range"
                                                min="50"
                                                max="200"
                                                step="10"
                                                value={zoom}
                                                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                                                className="w-28 h-2 accent-premium-blue rounded-lg"
                                                title="Zoom slider (50-200%)"
                                            />

                                            <button
                                                type="button"
                                                onClick={handleZoomIn}
                                                disabled={zoom >= 200}
                                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                title="Zoom in (Ctrl+Scroll)"
                                            >
                                                <ZoomIn size={16} />
                                            </button>

                                            <span className="text-sm font-bold text-slate-700 min-w-[4rem] text-center">
                                                {zoom}%
                                            </span>

                                            <div className="w-px h-6 bg-slate-200" />

                                            <button
                                                type="button"
                                                onClick={handleFitToView}
                                                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                                                title="Fit canvas to view"
                                            >
                                                <Maximize size={14} />
                                                Fit
                                            </button>
                                        </div>

                                        <div className="text-[10px] text-slate-400 font-medium hidden sm:block">
                                            Tip: Hold Ctrl + Scroll to zoom
                                        </div>
                                    </div>
                                )}
                                <div className={cn(
                                    "flex-1 min-w-0 flex",
                                    isFullscreen ? "h-full" : ""
                                )}>
                                    {form.imageUrl ? (
                                        <div className={cn(
                                            "relative rounded-b-2xl overflow-hidden border-2 border-t-0 border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,white_0%_50%)] bg-[length:20px_20px] flex-1",
                                            isFullscreen ? "h-full" : ""
                                        )}>
                                            {/* Canvas Container with Zoom */}
                                            <div
                                                ref={canvasContainerRef}
                                                className={cn(
                                                    "relative w-full overflow-auto",
                                                    isFullscreen ? "h-full flex items-center justify-center" : ""
                                                )}
                                                onWheel={handleCanvasWheel}
                                            >
                                                <div
                                                    className={cn(
                                                        "relative",
                                                        isFullscreen ? "mx-auto my-auto" : "w-full"
                                                    )}
                                                    style={{
                                                        transform: `scale(${zoom / 100})`,
                                                        transformOrigin: "top center",
                                                        transition: "transform 0.2s ease-out"
                                                    }}
                                                >
                                                    <div
                                                        ref={canvasRef}
                                                        className={cn(
                                                            "relative",
                                                            isFullscreen ? "max-h-full max-w-full" : "w-full"
                                                        )}
                                                        style={isFullscreen ? { aspectRatio: "auto" } : {}}
                                                    >
                                                        <img
                                                            src={form.imageUrl}
                                                            alt="Template preview"
                                                            className={cn(
                                                                "block",
                                                                isFullscreen
                                                                    ? "max-h-[calc(100vh-220px)] max-w-full object-contain mx-auto"
                                                                    : "w-full h-auto"
                                                            )}
                                                            draggable={false}
                                                            onDragStart={e => e.preventDefault()}
                                                            onError={(e) => {
                                                                console.error("Failed to load template image:", form.imageUrl);
                                                                setImageLoadError(true);
                                                                e.target.style.display = "none";
                                                            }}
                                                            onLoad={() => {
                                                                console.log("Template image loaded successfully:", form.imageUrl);
                                                                setImageLoadError(false);
                                                            }}
                                                        />

                                                        {/* Draggable Placeholders */}
                                                        {Object.entries(form.placeholders).map(([key, placeholder]) => (
                                                            <DraggablePlaceholder
                                                                key={key}
                                                                id={key}
                                                                placeholder={placeholder}
                                                                meta={PLACEHOLDER_META[key]}
                                                                containerRef={canvasRef}
                                                                onDrag={handleDrag}
                                                                isSelected={selectedPlaceholder === key}
                                                                onSelect={setSelectedPlaceholder}
                                                                zoom={zoom}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Image Load Error Message */}
                                            {imageLoadError && (
                                                <div className="absolute inset-0 rounded-b-2xl bg-red-50/95 flex items-center justify-center border-2 border-red-200">
                                                    <div className="text-center p-6 max-w-md">
                                                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                            <X size={24} className="text-red-600" />
                                                        </div>
                                                        <p className="font-semibold text-red-900 mb-1">Failed to load template image</p>
                                                        <p className="text-sm text-red-700 mb-4">
                                                            Image URL: <code className="text-xs bg-red-100/50 px-2 py-1 rounded">{form.imageUrl}</code>
                                                        </p>
                                                        <p className="text-xs text-red-600 mb-4">
                                                            The image file may be missing or inaccessible. Try uploading it again.
                                                        </p>
                                                        <Button
                                                            size="sm"
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            Upload Image Again
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Canvas Footer */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pointer-events-none">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                                                        {Object.values(form.placeholders).filter(p => p.enabled).length} active placeholders
                                                    </span>
                                                    <span className="text-white/60 text-[10px] font-medium">
                                                        Drag to reposition • Click to select
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "border-2 border-dashed border-slate-200 rounded-b-2xl flex items-center justify-center text-center flex-1",
                                            isFullscreen ? "h-full" : "min-h-[400px]"
                                        )}>
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                                    <Upload size={28} className="text-slate-300" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-500">Upload a certificate image</p>
                                                    <p className="text-xs text-slate-400 mt-1">Then drag placeholders to position them</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Style Panel on Right */}
                                {selectedPlaceholder && form.placeholders[selectedPlaceholder]?.enabled && (
                                    <StylePanel
                                        selectedPlaceholder={selectedPlaceholder}
                                        placeholder={form.placeholders[selectedPlaceholder]}
                                        meta={PLACEHOLDER_META[selectedPlaceholder]}
                                        onChange={(field, value) => handlePlaceholderStyleChange(selectedPlaceholder, field, value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.length === 0 ? (
                            <div className="col-span-full p-12 text-center">
                                <p className="text-slate-500 text-sm font-medium">No templates yet. Create your first certificate template to get started.</p>
                            </div>
                        ) : (
                            templates.map(template => (
                                <div key={template._id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                                    {/* Template Preview */}
                                    <div className="relative bg-slate-100 aspect-[8.5/11] overflow-hidden">
                                        {template.imageUrl && (
                                            <img
                                                src={template.imageUrl}
                                                alt={template.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>

                                    {/* Template Info */}
                                    <div className="p-4 space-y-3">
                                        <div>
                                                <h4 className="font-bold text-slate-900">{template.name}</h4>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEditTemplate(template)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-bold"
                                            >
                                                <Edit size={12} /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTemplate(template._id)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
