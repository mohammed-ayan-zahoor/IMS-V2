"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Loader2, Star, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

export default function CertificateTemplateManager() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Editor state
    const [form, setForm] = useState({
        name: "",
        templateImage: null,
        imageUrl: "",
        placeholders: {
            studentName: { x: 50, y: 45, enabled: true },
            courseName: { x: 50, y: 55, enabled: true },
            issueDate: { x: 50, y: 85, enabled: true },
            certificateNumber: { x: 85, y: 85, enabled: true }
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
                setTemplates(data.data || []);
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
        setForm({
            name: template.name,
            templateImage: null,
            imageUrl: template.imageUrl || template.styles?.backgroundImage || "",
            placeholders: template.placeholders || {
                studentName: { x: 50, y: 45, enabled: true },
                courseName: { x: 50, y: 55, enabled: true },
                issueDate: { x: 50, y: 85, enabled: true },
                certificateNumber: { x: 85, y: 85, enabled: true }
            },
            isDefault: template.isDefault
        });
        setShowEditor(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            name: "",
            templateImage: null,
            imageUrl: "",
            placeholders: {
                studentName: { x: 50, y: 45, enabled: true },
                courseName: { x: 50, y: 55, enabled: true },
                issueDate: { x: 50, y: 85, enabled: true },
                certificateNumber: { x: 85, y: 85, enabled: true }
            },
            isDefault: false
        });
    };

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
                    <div className="space-y-6 border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-900">
                                {editingId ? "Edit Template" : "Create New Template"}
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditor(false);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Form */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Template Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g., Modern Certificates"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Design Image *</label>
                                    <div
                                        onClick={() => !uploadingImage && fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-premium-blue hover:bg-premium-blue/5 transition-all"
                                    >
                                        {uploadingImage ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin text-premium-blue" size={24} />
                                                <p className="text-sm text-slate-500">Uploading...</p>
                                            </div>
                                        ) : form.imageUrl ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-2xl">✓</div>
                                                <p className="text-xs text-green-600 font-bold">Image uploaded</p>
                                                <p className="text-xs text-slate-500">Click to change</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload size={24} className="text-slate-400" />
                                                <p className="text-sm font-bold text-slate-700">Upload Template Image</p>
                                                <p className="text-xs text-slate-500">PNG or JPG, max 5MB</p>
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

                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <input
                                        type="checkbox"
                                        checked={form.isDefault}
                                        onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                                        className="w-4 h-4 rounded accent-premium-blue"
                                    />
                                    <label className="text-sm font-bold text-slate-700">Set as default template</label>
                                </div>
                            </div>

                            {/* Right: Preview and Placeholder Editor */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Preview & Placeholders</label>
                                    
                                    {form.imageUrl ? (
                                        <div className="space-y-4">
                                            {/* Preview */}
                                            <div className="relative border rounded-lg overflow-hidden bg-slate-100 aspect-[8.5/11]">
                                                <img
                                                    src={form.imageUrl}
                                                    alt="Template preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Placeholder markers */}
                                                {Object.entries(form.placeholders).map(([key, placeholder]) =>
                                                    placeholder.enabled ? (
                                                        <div
                                                            key={key}
                                                            className="absolute w-20 h-8 border-2 border-amber-400 bg-amber-400/10 flex items-center justify-center text-xs font-bold text-amber-700 pointer-events-none"
                                                            style={{
                                                                left: `${placeholder.x}%`,
                                                                top: `${placeholder.y}%`,
                                                                transform: 'translate(-50%, -50%)'
                                                            }}
                                                        >
                                                            {key.split(/(?=[A-Z])/).join('\n')}
                                                        </div>
                                                    ) : null
                                                )}
                                            </div>

                                            {/* Placeholder Controls */}
                                            <div className="bg-slate-50 rounded-lg p-3 space-y-3 max-h-48 overflow-y-auto">
                                                {Object.entries(form.placeholders).map(([key, placeholder]) => (
                                                    <div key={key} className="space-y-2 pb-2 border-b last:border-b-0">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={placeholder.enabled}
                                                                onChange={e => handlePlaceholderChange(key, "enabled", e.target.checked)}
                                                                className="w-3 h-3 rounded accent-premium-blue"
                                                            />
                                                            <label className="text-xs font-bold text-slate-700 flex-1">
                                                                {key}
                                                            </label>
                                                        </div>
                                                        {placeholder.enabled && (
                                                            <div className="grid grid-cols-2 gap-2 ml-5">
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={placeholder.x}
                                                                    onChange={e => handlePlaceholderChange(key, "x", parseInt(e.target.value))}
                                                                    className="col-span-2 w-full h-1.5"
                                                                    title="X position"
                                                                />
                                                                <label className="text-xs text-slate-500">X: {placeholder.x}%</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={placeholder.x}
                                                                    onChange={e => handlePlaceholderChange(key, "x", parseInt(e.target.value))}
                                                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200 outline-none"
                                                                />
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={placeholder.y}
                                                                    onChange={e => handlePlaceholderChange(key, "y", parseInt(e.target.value))}
                                                                    className="col-span-2 w-full h-1.5"
                                                                    title="Y position"
                                                                />
                                                                <label className="text-xs text-slate-500">Y: {placeholder.y}%</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={placeholder.y}
                                                                    onChange={e => handlePlaceholderChange(key, "y", parseInt(e.target.value))}
                                                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                            <p className="text-sm text-slate-500">Upload an image to preview and position placeholders</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="flex-1 px-6 py-2 bg-premium-blue text-white font-bold rounded-lg hover:bg-premium-blue/90 transition-colors flex items-center justify-center gap-2"
                            >
                                {editingId ? "Update Template" : "Create Template"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditor(false);
                                    resetForm();
                                }}
                                className="flex-1 px-6 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
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
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900">{template.name}</h4>
                                                {template.isDefault && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                                                        <Star size={10} /> Default
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {!template.isDefault && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetDefault(template._id)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-bold"
                                                >
                                                    <Star size={12} /> Default
                                                </button>
                                            )}
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
