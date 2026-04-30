"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
    Plus, Loader2, Star, Upload, X, Eye, Type, Hash, 
    BookOpen, Palette, Settings, Check, AlertCircle,
    ZoomIn, ZoomOut, Maximize2, Minimize2, Edit, Trash2, Maximize, RefreshCw, User
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { DOCUMENT_PLACEHOLDERS, CATEGORY_REQUIREMENTS } from "@/lib/certificate-templates/placeholderSchema";
import { FORMAL_TEMPLATES } from "@/lib/certificate-templates/templates";
import Handlebars from "handlebars";

Handlebars.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
});

export default function HtmlCertificateEditor() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState("html");
    const [selectedCategory, setSelectedCategory] = useState("GENERAL");

    const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [previewData, setPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewStudentName, setPreviewStudentName] = useState(null);

    const [form, setForm] = useState({
        name: "",
        type: "CUSTOM",
        renderMode: "HTML_TEMPLATE",
        category: "GENERAL",
        htmlTemplate: "",
        cssContent: "",
        placeholderSchema: [],
        pageConfig: {
            size: "A4",
            orientation: "portrait",
            margins: { top: 15, bottom: 15, left: 15, right: 15 }
        },
        isDefault: false
    });

    const mockData = {
        student: {
            fullName: "John Alexander Doe",
            fatherName: "Robert Doe",
            motherName: "Jane Doe",
            grNumber: "GR/2024/001",
            dob: "2008-05-15",
            dobWords: "Fifteenth May Two Thousand and Eight",
            admissionDate: "2020-06-15",
            gender: "Male",
            nationality: "Indian",
            religion: "Hindu",
            caste: "General",
            placeOfBirth: "Mumbai",
            lastSchool: "City Public School",
            enrollmentNo: "IMS/2024/001",
            rollNo: "2401",
            address: "123 Educational Way, Knowledge City"
        },
        course: {
            name: "Class X-A"
        },
        batch: {
            name: "2024-25 Batch A"
        },
        academicYear: "2024-25",
        metadata: {
            leavingReason: "Parent's Request",
            leavingDate: "15/06/2024",
            conduct: "Good",
            progress: "Excellent"
        },
        institute: {
            name: "EduVanta International School",
            address: "Premium Campus, Silicon Valley",
            phone: "+91 98765 43210",
            email: "admin@eduvanta.com",
            website: "www.eduvanta.com",
            logo: "/logo.png",
            udiseNumber: "27260100501"
        },
        certificate: {
            issueDate: new Date().toLocaleDateString('en-GB'),
            number: "CERT/2024/789",
            category: "LEAVING_CERTIFICATE"
        }
    };

    const activePreviewData = previewData || mockData;

    const fetchRandomStudent = async () => {
        setLoadingPreview(true);
        try {
            const res = await fetch("/api/v1/certificate-templates/preview-data");
            if (res.ok) {
                const data = await res.json();
                setPreviewData(data.data);
                setPreviewStudentName(data.studentName);
                toast.success(`Preview: ${data.studentName}`);
            } else {
                toast.error("No students found for preview");
            }
        } catch (error) {
            console.error("Failed to fetch preview data:", error);
            toast.error("Failed to fetch student data");
        } finally {
            setLoadingPreview(false);
        }
    };

    const getPreviewHtml = useCallback(() => {
        try {
            const template = Handlebars.compile(form.htmlTemplate || "<div style='padding: 20px; text-align: center; color: #64748b;'>Template is empty. Start typing...</div>");
            const content = template(activePreviewData);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        html, body { 
                            margin: 0; 
                            padding: 0; 
                            background: white; 
                            width: 100%;
                            height: 100%;
                        }
                        .page {
                            position: relative;
                            width: ${form.pageConfig.orientation === 'portrait' ? '210mm' : '297mm'};
                            height: ${form.pageConfig.orientation === 'portrait' ? '297mm' : '210mm'};
                            padding: ${form.pageConfig.margins.top}mm ${form.pageConfig.margins.right}mm ${form.pageConfig.margins.bottom}mm ${form.pageConfig.margins.left}mm;
                            box-sizing: border-box;
                            overflow: hidden;
                            background: white;
                        }
                        ${form.cssContent}
                    </style>
                </head>
                <body>
                    <div class="page">
                        ${content}
                    </div>
                </body>
                </html>
            `;
        } catch (err) {
            return `<div style="color: red; padding: 20px; font-family: monospace;">Error: ${err.message}</div>`;
        }
    }, [form.htmlTemplate, form.cssContent, form.pageConfig, activePreviewData]);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/v1/certificate-templates");
            if (res.ok) {
                const data = await res.json();
                setTemplates((data.data || []).filter(t => t.htmlTemplate));
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Template name is required");
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
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(editingId ? "Template updated" : "Template created");
                fetchTemplates();
                resetForm();
                setShowEditor(false);
            } else {
                toast.error(data.error || "Failed to save");
            }
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Failed to save template");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this template?")) return;
        try {
            const res = await fetch(`/api/v1/certificate-templates/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Template deleted");
                fetchTemplates();
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await fetch(`/api/v1/certificate-templates/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true })
            });
            toast.success("Set as default");
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to set default");
        }
    };

    const handleEdit = (template) => {
        setEditingId(template._id);
        setForm({
            name: template.name,
            type: template.type || "CUSTOM",
            renderMode: template.renderMode || "HTML_TEMPLATE",
            category: template.category || "GENERAL",
            htmlTemplate: template.htmlTemplate || "",
            cssContent: template.cssContent || "",
            placeholderSchema: template.placeholderSchema || [],
            pageConfig: template.pageConfig || {
                size: "A4",
                orientation: "portrait",
                margins: { top: 15, bottom: 15, left: 15, right: 15 }
            },
            isDefault: template.isDefault
        });
        setShowEditor(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            name: "",
            type: "CUSTOM",
            renderMode: "HTML_TEMPLATE",
            category: "GENERAL",
            htmlTemplate: "",
            cssContent: "",
            placeholderSchema: [],
            pageConfig: {
                size: "A4",
                orientation: "portrait",
                margins: { top: 15, bottom: 15, left: 15, right: 15 }
            },
            isDefault: false
        });
    };

    const loadPreset = (template) => {
        setForm(prev => ({
            ...prev,
            name: template.name,
            category: template.category,
            htmlTemplate: template.html,
            cssContent: template.css,
            placeholderSchema: CATEGORY_REQUIREMENTS[template.category] || []
        }));
        toast.success(`Loaded ${template.name}`);
    };

    const handleCopyPlaceholder = (path) => {
        navigator.clipboard.writeText(`{{${path}}}`);
        toast.success(`Copied {{${path}}}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-premium-blue" size={32} />
            </div>
        );
    }

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-slate-50/30">
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b bg-white -mx-6 -mt-6 px-6 py-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <BookOpen className="text-premium-blue" size={24} />
                            HTML Certificate Templates
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Create formal certificates with pixel-perfect HTML & Handlebars</p>
                    </div>
                    {!showEditor && (
                        <button 
                            type="button" 
                            onClick={() => setShowEditor(true)} 
                            className="flex items-center gap-2 px-6 py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus size={18} /> New Template
                        </button>
                    )}
                </div>

                {showEditor ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-lg leading-none">
                                        {editingId ? "Modify Template" : "Draft New Template"}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                                        {form.renderMode.replace("_", " ")} Mode
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => { setShowEditor(false); resetForm(); }}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} className="text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* ─── Sidebar Controls (4 cols) ─── */}
                            <div className="lg:col-span-3 space-y-5">
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
                                        <Input
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g., Transfer Certificate"
                                            className="bg-slate-50 border-transparent focus:bg-white focus:border-premium-blue font-bold text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 text-slate-700 focus:ring-2 focus:ring-premium-blue/20 outline-none transition-all"
                                        >
                                            <option value="GENERAL">General Template</option>
                                            <option value="BONAFIDE">Bonafide Certificate</option>
                                            <option value="LEAVING_CERTIFICATE">Leaving Certificate</option>
                                            <option value="TRANSFER_CERTIFICATE">Transfer Certificate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <Star size={12} /> Load Preset
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.values(FORMAL_TEMPLATES).map(t => (
                                            <button
                                                key={t.category}
                                                type="button"
                                                onClick={() => loadPreset(t)}
                                                className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all group"
                                            >
                                                <span className="text-xs font-bold text-slate-700 block truncate">{t.name}</span>
                                                <span className="text-[9px] text-blue-500 font-bold group-hover:translate-x-1 transition-transform inline-block">Click to load →</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                        <Maximize size={12} /> Page Setup
                                    </p>
                                    <div className="flex gap-2 p-1 bg-white rounded-xl border border-amber-100">
                                        {['portrait', 'landscape'].map(orient => (
                                            <button
                                                key={orient}
                                                type="button"
                                                onClick={() => setForm({ ...form, pageConfig: { ...form.pageConfig, orientation: orient } })}
                                                className={cn(
                                                    "flex-1 py-2 text-xs font-black rounded-lg capitalize transition-all",
                                                    form.pageConfig.orientation === orient
                                                        ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                                        : "text-amber-600 hover:bg-amber-50"
                                                )}
                                            >
                                                {orient}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <button 
                                        onClick={handleSave} 
                                        className="w-full py-3.5 bg-premium-blue text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> {editingId ? "Update Template" : "Create Template"}
                                    </button>
                                    <button 
                                        variant="outline" 
                                        onClick={() => { setShowEditor(false); resetForm(); }}
                                        className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                                    >
                                        Discard Changes
                                    </button>
                                </div>
                            </div>

                            {/* ─── Main Editor + Preview Area (9 cols) ─── */}
                            <div className={cn(
                                "lg:col-span-9 flex flex-col",
                                isPreviewExpanded 
                                    ? "fixed inset-4 z-50 bg-slate-50 rounded-3xl p-6 shadow-2xl" 
                                    : ""
                            )}
                            style={!isPreviewExpanded ? { height: 'calc(100vh - 200px)', minHeight: '500px' } : {}}
                            >
                                <div className="flex items-center justify-between bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
                                    <div className="flex gap-1">
                                        {[
                                            { id: "html", label: "HTML Template", icon: Type },
                                            { id: "css", label: "Styles", icon: Palette },
                                            { id: "config", label: "Settings", icon: Settings },
                                            { id: "placeholders", label: "Placeholders", icon: Hash }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                    activeTab === tab.id
                                                        ? "bg-white text-premium-blue shadow-sm border border-slate-200/50"
                                                        : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                <tab.icon size={14} /> {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pr-2">
                                        <div className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1 gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setZoom(Math.max(50, zoom - 10))}
                                                className="p-1 hover:bg-slate-50 rounded text-slate-500"
                                            >
                                                <ZoomOut size={14} />
                                            </button>
                                            <span className="text-[10px] font-bold text-slate-600 min-w-[30px] text-center">{zoom}%</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setZoom(Math.min(200, zoom + 10))}
                                                className="p-1 hover:bg-slate-50 rounded text-slate-500"
                                            >
                                                <ZoomIn size={14} />
                                            </button>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-premium-blue transition-colors"
                                        >
                                            {isPreviewExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
                                    {/* Editor Side */}
                                    <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                                        <div className="flex-1 min-h-0 overflow-auto">
                                            {activeTab === "html" && (
                                                <textarea
                                                    value={form.htmlTemplate}
                                                    onChange={e => setForm({ ...form, htmlTemplate: e.target.value })}
                                                    className="w-full h-full p-6 font-mono text-xs leading-relaxed resize-none outline-none bg-slate-50/50"
                                                    placeholder="Enter Handlebars HTML template..."
                                                />
                                            )}
                                            {activeTab === "css" && (
                                                <textarea
                                                    value={form.cssContent}
                                                    onChange={e => setForm({ ...form, cssContent: e.target.value })}
                                                    className="w-full h-full p-6 font-mono text-xs leading-relaxed resize-none outline-none bg-slate-50/50"
                                                    placeholder="Enter CSS styles..."
                                                />
                                            )}
                                            {activeTab === "config" && (
                                                <div className="p-6 space-y-6 overflow-y-auto max-h-full">
                                                    <div className="space-y-4">
                                                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Page Margins (mm)</h5>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {['top', 'bottom', 'left', 'right'].map(m => (
                                                                <div key={m} className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-slate-500 capitalize">{m}</label>
                                                                    <input
                                                                        type="number"
                                                                        value={form.pageConfig.margins[m]}
                                                                        onChange={e => setForm({
                                                                            ...form,
                                                                            pageConfig: {
                                                                                ...form.pageConfig,
                                                                                margins: { ...form.pageConfig.margins, [m]: parseInt(e.target.value) || 0 }
                                                                            }
                                                                        })}
                                                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-premium-blue transition-all"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                                            <span className="font-bold text-slate-700 block mb-1 underline">A4 Standards</span>
                                                            Portrait: 210mm × 297mm<br/>
                                                            Landscape: 297mm × 210mm<br/>
                                                            Margins are applied inside the canvas.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {activeTab === "placeholders" && (
                                                <div className="p-6 space-y-4 h-full flex flex-col">
                                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">
                                                            <Hash size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-blue-700">Dynamic Placeholders</p>
                                                            <p className="text-[10px] text-blue-600 mt-0.5">Click any placeholder below to copy its Handlebars tag.</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar">
                                                        {Object.entries(DOCUMENT_PLACEHOLDERS).map(([key, meta]) => (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => handleCopyPlaceholder(meta.path)}
                                                                className="text-left p-3 rounded-xl border border-slate-100 bg-white hover:border-premium-blue hover:shadow-md transition-all group"
                                                            >
                                                                <span className="text-[10px] font-black text-slate-700 block uppercase tracking-tight">{meta.label}</span>
                                                                <code className="text-[11px] text-premium-blue font-mono mt-1 block">{"{{"}{meta.path}{"}}"}</code>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preview Side */}
                                    <div className="flex-1 min-w-0 min-h-0 bg-slate-200 rounded-2xl overflow-hidden relative border border-slate-300 shadow-inner group">
                                        {/* Blueprint Background */}
                                        <div 
                                            className="absolute inset-0 opacity-40 pointer-events-none"
                                            style={{
                                                backgroundImage: `
                                                    radial-gradient(#3b82f6 0.5px, transparent 0.5px),
                                                    linear-gradient(#cbd5e1 0.5px, transparent 0.5px),
                                                    linear-gradient(90deg, #cbd5e1 0.5px, transparent 0.5px)
                                                `,
                                                backgroundSize: '10px 10px, 50px 50px, 50px 50px',
                                                backgroundPosition: '0 0, -0.5px -0.5px, -0.5px -0.5px'
                                            }}
                                        />

                                        <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
                                            {/* Sizing wrapper: dimensions match the scaled page so scrolling works correctly */}
                                            <div style={{
                                                width: `calc(${form.pageConfig.orientation === 'portrait' ? '210mm' : '297mm'} * ${zoom / 100})`,
                                                height: `calc(${form.pageConfig.orientation === 'portrait' ? '297mm' : '210mm'} * ${zoom / 100} + 32px)`,
                                                margin: '0 auto',
                                            }}>
                                                <div 
                                                    className="bg-white shadow-2xl transition-all duration-300"
                                                    style={{
                                                        width: form.pageConfig.orientation === 'portrait' ? '210mm' : '297mm',
                                                        height: form.pageConfig.orientation === 'portrait' ? '297mm' : '210mm',
                                                        transform: `scale(${zoom / 100})`,
                                                        transformOrigin: 'top left',
                                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <iframe
                                                        srcDoc={getPreviewHtml()}
                                                        className="w-full h-full border-none pointer-events-none"
                                                        title="Preview"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                            <div className="flex gap-2">
                                                <div className="px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 pointer-events-none">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", previewData ? "bg-blue-400 animate-pulse" : "bg-emerald-400 animate-pulse")} />
                                                    {previewData ? `Real Data: ${previewStudentName}` : 'Mock Data Preview'}
                                                </div>
                                                <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-slate-600 text-[9px] font-black uppercase tracking-widest border border-slate-200 pointer-events-none">
                                                    {form.pageConfig.orientation} • A4
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchRandomStudent}
                                                disabled={loadingPreview}
                                                className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-slate-700 text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-white hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                                title="Load a random student's real data"
                                            >
                                                {loadingPreview ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                                {previewData ? 'Next Student' : 'Use Real Data'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Plus size={32} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold">No HTML templates yet.</p>
                                <p className="text-xs text-slate-400 mt-1">Create your first pixel-perfect certificate template!</p>
                                <button 
                                    onClick={() => setShowEditor(true)}
                                    className="mt-6 px-6 py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                >
                                    Create Template
                                </button>
                            </div>
                        ) : (
                            templates.map(template => (
                                <div key={template._id} className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300">
                                    <div className="aspect-[4/3] bg-slate-50 border-b border-slate-100 relative overflow-hidden flex items-center justify-center p-4">
                                        <div className="w-full h-full bg-white shadow-lg rounded-sm border border-slate-200 overflow-hidden scale-75 group-hover:scale-90 transition-transform duration-500">
                                            {/* Mini Preview Iframe */}
                                            <iframe
                                                srcDoc={`
                                                    <html>
                                                        <head><style>body { margin: 0; transform: scale(0.3); transform-origin: top left; } ${template.cssContent}</style></head>
                                                        <body>${template.htmlTemplate}</body>
                                                    </html>
                                                `}
                                                className="w-[333%] h-[333%] border-none pointer-events-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h4 className="font-black text-slate-900 truncate">{template.name}</h4>
                                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">
                                            {(template.category || 'GENERAL').replace(/_/g, ' ')}
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-2 mt-5">
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 font-bold text-xs"
                                            >
                                                <Edit size={16} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template._id)}
                                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
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