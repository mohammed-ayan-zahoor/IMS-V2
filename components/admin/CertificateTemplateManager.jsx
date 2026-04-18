"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

export default function CertificateTemplateManager() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: "",
        description: "",
        type: "CUSTOM",
        isDefault: false,
        styles: {
            backgroundColor: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
            borderColor: "#2c5aa0",
            borderWidth: 3,
            fontFamily: "Georgia, serif",
            titleColor: "#2c5aa0",
            titleFontSize: 48,
            textColor: "#555",
            accentColor: "#2c5aa0"
        },
        placeholders: {
            studentName: {
                enabled: true,
                label: "Student Name",
                fontSize: 36,
                fontWeight: "bold",
                color: "#2c5aa0",
                decoration: "underline",
                position: { top: 45, left: 50, width: 80 }
            },
            courseName: {
                enabled: true,
                label: "Course Name",
                fontSize: 18,
                fontWeight: "600",
                color: "#2c5aa0",
                position: { top: 55, left: 50, width: 80 }
            },
            issueDate: {
                enabled: true,
                label: "Date Issued",
                fontSize: 14,
                color: "#555",
                position: { bottom: 15, left: 50, width: 80 }
            },
            certificateNumber: {
                enabled: true,
                label: "Certificate #",
                fontSize: 12,
                color: "#999",
                position: { bottom: 20, right: 15, width: 20 }
            },
            instituteName: {
                enabled: true,
                label: "Institution Name",
                fontSize: 14,
                fontWeight: "600",
                color: "#2c5aa0",
                position: { top: 10, left: 50, width: 80 }
            },
            signatureBlock: {
                enabled: true,
                label: "Authorized Signature",
                position: { bottom: 15, left: 10, width: 20 }
            }
        }
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

    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        
        if (!form.name.trim()) {
            toast.error("Template name is required");
            return;
        }

        setIsSaving(true);
        try {
            const method = editingId ? "PUT" : "POST";
            const url = editingId 
                ? `/api/v1/certificate-templates/${editingId}`
                : "/api/v1/certificate-templates";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            
            if (res.ok) {
                toast.success(editingId ? "Template updated successfully" : "Template created successfully");
                fetchTemplates();
                resetForm();
                setShowForm(false);
            } else {
                toast.error(data.error || "Failed to save template");
            }
        } catch (error) {
            console.error("Error saving template:", error);
            toast.error("Failed to save template");
        } finally {
            setIsSaving(false);
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
        setForm(template);
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            name: "",
            description: "",
            type: "CUSTOM",
            isDefault: false,
            styles: {
                backgroundColor: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
                borderColor: "#2c5aa0",
                borderWidth: 3,
                fontFamily: "Georgia, serif",
                titleColor: "#2c5aa0",
                titleFontSize: 48,
                textColor: "#555",
                accentColor: "#2c5aa0"
            },
            placeholders: {
                studentName: {
                    enabled: true,
                    label: "Student Name",
                    fontSize: 36,
                    fontWeight: "bold",
                    color: "#2c5aa0",
                    decoration: "underline",
                    position: { top: 45, left: 50, width: 80 }
                },
                courseName: {
                    enabled: true,
                    label: "Course Name",
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#2c5aa0",
                    position: { top: 55, left: 50, width: 80 }
                },
                issueDate: {
                    enabled: true,
                    label: "Date Issued",
                    fontSize: 14,
                    color: "#555",
                    position: { bottom: 15, left: 50, width: 80 }
                },
                certificateNumber: {
                    enabled: true,
                    label: "Certificate #",
                    fontSize: 12,
                    color: "#999",
                    position: { bottom: 20, right: 15, width: 20 }
                },
                instituteName: {
                    enabled: true,
                    label: "Institution Name",
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#2c5aa0",
                    position: { top: 10, left: 50, width: 80 }
                },
                signatureBlock: {
                    enabled: true,
                    label: "Authorized Signature",
                    position: { bottom: 15, left: 10, width: 20 }
                }
            }
        });
    };

    const handleUpdatePlaceholder = (key, field, value) => {
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

    const handleUpdateStyle = (key, value) => {
        setForm(prev => ({
            ...prev,
            styles: {
                ...prev.styles,
                [key]: value
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Certificate Templates</h3>
                    <p className="text-xs text-slate-500 mt-1">Create and manage customizable certificate templates</p>
                </div>
                {!showForm && (
                    <Button 
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} /> New Template
                    </Button>
                )}
            </div>

            {/* Templates List or Form */}
            {showForm ? (
                <Card>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h4 className="font-bold text-slate-900">
                                {editingId ? "Edit Template" : "Create New Template"}
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveTemplate} className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Template Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g., Modern, Elegant"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all"
                                    >
                                        <option value="STANDARD">Standard</option>
                                        <option value="MODERN">Modern</option>
                                        <option value="ELEGANT">Elegant</option>
                                        <option value="PROFESSIONAL">Professional</option>
                                        <option value="CUSTOM">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Brief description of this template"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Style Section */}
                            <div className="border-t pt-4">
                                <h5 className="font-bold text-slate-900 mb-4">Certificate Styles</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Border Color</label>
                                        <input
                                            type="color"
                                            value={form.styles.borderColor}
                                            onChange={e => handleUpdateStyle("borderColor", e.target.value)}
                                            className="w-full h-10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Title Color</label>
                                        <input
                                            type="color"
                                            value={form.styles.titleColor}
                                            onChange={e => handleUpdateStyle("titleColor", e.target.value)}
                                            className="w-full h-10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Text Color</label>
                                        <input
                                            type="color"
                                            value={form.styles.textColor}
                                            onChange={e => handleUpdateStyle("textColor", e.target.value)}
                                            className="w-full h-10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Accent Color</label>
                                        <input
                                            type="color"
                                            value={form.styles.accentColor}
                                            onChange={e => handleUpdateStyle("accentColor", e.target.value)}
                                            className="w-full h-10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Placeholders Section */}
                            <div className="border-t pt-4">
                                <h5 className="font-bold text-slate-900 mb-4">Certificate Elements</h5>
                                <div className="space-y-4">
                                    {Object.entries(form.placeholders).map(([key, placeholder]) => (
                                        <div key={key} className="bg-slate-50 p-4 rounded-lg space-y-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={placeholder.enabled}
                                                    onChange={e => handleUpdatePlaceholder(key, "enabled", e.target.checked)}
                                                    className="w-4 h-4 rounded accent-premium-blue"
                                                />
                                                <label className="font-bold text-slate-700">{placeholder.label}</label>
                                            </div>
                                            
                                            {placeholder.enabled && (
                                                <div className="grid grid-cols-2 gap-3 ml-7">
                                                    {placeholder.fontSize !== undefined && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-slate-600">Font Size</label>
                                                            <input
                                                                type="number"
                                                                value={placeholder.fontSize}
                                                                onChange={e => handleUpdatePlaceholder(key, "fontSize", parseInt(e.target.value))}
                                                                className="w-full px-2 py-1 text-xs rounded border border-slate-200 focus:border-premium-blue outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                    {placeholder.color && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-slate-600">Color</label>
                                                            <input
                                                                type="color"
                                                                value={placeholder.color}
                                                                onChange={e => handleUpdatePlaceholder(key, "color", e.target.value)}
                                                                className="w-full h-7 rounded-lg cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Set as Default */}
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <input
                                    type="checkbox"
                                    checked={form.isDefault}
                                    onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                                    className="w-4 h-4 rounded accent-premium-blue"
                                />
                                <label className="text-sm font-bold text-slate-700">Set as default template</label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="flex-1"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" size={16} /> Saving...
                                        </>
                                    ) : (
                                        editingId ? "Update Template" : "Create Template"
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-2 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.length === 0 ? (
                        <Card className="col-span-full p-12 text-center">
                            <p className="text-slate-500 text-sm font-medium">No templates yet. Create your first certificate template to get started.</p>
                        </Card>
                    ) : (
                        templates.map(template => (
                            <Card key={template._id} className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900">{template.name}</h4>
                                                {template.isDefault && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                                                        <Star size={12} /> Default
                                                    </span>
                                                )}
                                            </div>
                                            {template.description && (
                                                <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-bold">
                                            {template.type}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        {!template.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => handleSetDefault(template._id)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-bold"
                                            >
                                                <Star size={14} /> Set Default
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleEditTemplate(template)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-bold"
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTemplate(template._id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
