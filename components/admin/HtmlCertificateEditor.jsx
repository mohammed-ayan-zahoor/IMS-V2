"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
    Plus, Loader2, Star, Upload, X, Eye, Type, Hash, 
    BookOpen, Palette, Settings, Check, AlertCircle,
    ZoomIn, ZoomOut, ArrowLeft, Code2, Columns, Edit, Trash2, 
    Maximize, RefreshCw, User, Copy, Search
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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

export default function HtmlCertificateEditor({
    initialEditingTemplate = undefined,
    isOpen = false,
    onClose = undefined,
    onSaveSuccess = undefined
} = {}) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [showEditor, setShowEditor] = useState(Boolean(isOpen || initialEditingTemplate));
    const [editingId, setEditingId] = useState(initialEditingTemplate?._id || null);
    
    // Agentic IDE Artifact View Mode: "split" (default side-by-side), "code" (full code), "preview" (full preview)
    const [viewMode, setViewMode] = useState("split");
    const [activeTab, setActiveTab] = useState("html");
    const [zoom, setZoom] = useState(100);
    const [previewData, setPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewStudentName, setPreviewStudentName] = useState(null);
    const [placeholderSearch, setPlaceholderSearch] = useState("");

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
            firstName: "John",
            lastName: "Doe",
            surname: "Doe",
            fullName: "John Alexander Doe",
            email: "john.doe@example.com",
            phone: "+91 98765 43210",
            gender: "Male",
            bloodGroup: "O+",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            photoImg: '<img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" alt="Student" style="width: 100%; height: 100%; object-fit: cover;" />',
            std: "Standard X-A",
            class: "Standard X-A",
            standard: "Standard X-A",
            courseName: "Standard X-A",
            street: "123 Educational Way",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            grNumber: "GR/2024/001",
            enrollmentNo: "IMS/2024/001",
            rollNo: "2401",
            studentId: "STU-12345678",
            uidNo: "1234-5678-9012",
            apaarId: "APAAR-7890",
            penNo: "PEN-4567",
            fatherName: "Robert Doe",
            fatherPhone: "+91 98765 00001",
            fatherAadhar: "1111-2222-3333",
            motherName: "Jane Doe",
            motherPhone: "+91 98765 00002",
            motherAadhar: "4444-5555-6666",
            guardianName: "William Smith",
            guardianPhone: "+91 98765 00003",
            guardianRelation: "Uncle",
            nationality: "Indian",
            motherTongue: "Marathi",
            religion: "Hindu",
            caste: "Maratha",
            subCaste: "96 Kuli",
            medium: "English",
            birthCity: "Pune",
            birthTaluka: "Haveli",
            birthDistrict: "Pune",
            birthState: "Maharashtra",
            birthCountry: "India",
            lastSchool: "City Public School",
            admissionDate: "15/06/2020",
            joiningDate: "15/06/2020",
            admissionStd: "Standard I",
            leavingDate: "15/06/2024",
            leavingReason: "Parent's Request",
            studyingSince: "Standard I",
            dob: "15/05/2008",
            dobDay: "15",
            dobMonth: "05",
            dobYear: "2008",
            dobWords: "Fifteenth May Two Thousand and Eight",
            progress: "Excellent",
            conduct: "Good",
            remarks: "Diligent and hardworking student."
        },
        class: "Standard X-A",
        std: "Standard X-A",
        standard: "Standard X-A",
        courseName: "Standard X-A",
        course: {
            name: "Standard X-A",
            class: "Standard X-A",
            std: "Standard X-A",
            standard: "Standard X-A",
            code: "STD-10",
            duration: "1 Year",
            academicYear: "2024-2025"
        },
        institute: {
            name: "EduVanta International School",
            address: "Plot 42, Knowledge Park, Education City, Maharashtra - 400001",
            phone: "+91 22 2345 6789",
            email: "info@eduvanta.edu.in",
            website: "www.eduvanta.edu.in",
            udiseNumber: "27210100101",
            affiliationNo: "CBSE/AFF/1130001",
            logo: "/images/logo.png"
        },
        certificate: {
            issueDate: new Date().toLocaleDateString('en-GB'),
            year: new Date().getFullYear().toString(),
            number: "CERT/2024/789",
            category: "LEAVING_CERTIFICATE"
        }
    };

    const activePreviewData = previewData || mockData;

    // Synchronize form when initialEditingTemplate or isOpen changes
    useEffect(() => {
        if (initialEditingTemplate) {
            setEditingId(initialEditingTemplate._id || null);
            setForm({
                name: initialEditingTemplate.name || "",
                type: initialEditingTemplate.type || "CUSTOM",
                renderMode: initialEditingTemplate.renderMode || "HTML_TEMPLATE",
                category: initialEditingTemplate.category || "GENERAL",
                htmlTemplate: initialEditingTemplate.htmlTemplate || "",
                cssContent: initialEditingTemplate.cssContent || "",
                placeholderSchema: initialEditingTemplate.placeholderSchema || [],
                pageConfig: initialEditingTemplate.pageConfig || {
                    size: "A4",
                    orientation: "portrait",
                    margins: { top: 15, bottom: 15, left: 15, right: 15 }
                },
                isDefault: Boolean(initialEditingTemplate.isDefault)
            });
            setShowEditor(true);
        } else if (isOpen) {
            // New template default
            setEditingId(null);
            const defaultPreset = FORMAL_TEMPLATES.BONAFIDE;
            setForm({
                name: "New Certificate Template",
                type: "CUSTOM",
                renderMode: "HTML_TEMPLATE",
                category: "BONAFIDE",
                htmlTemplate: defaultPreset?.html || "",
                cssContent: defaultPreset?.css || "",
                placeholderSchema: CATEGORY_REQUIREMENTS.BONAFIDE || [],
                pageConfig: {
                    size: "A4",
                    orientation: "portrait",
                    margins: { top: 15, bottom: 15, left: 15, right: 15 }
                },
                isDefault: false
            });
            setShowEditor(true);
        }
    }, [initialEditingTemplate, isOpen]);

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

    const fetchTemplates = async () => {
        setLoading(true);
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

    const handleClose = () => {
        setShowEditor(false);
        resetForm();
        if (onClose) {
            onClose();
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
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
                toast.success(editingId ? "Template updated successfully" : "Template created successfully");
                if (onSaveSuccess) {
                    onSaveSuccess(data.data);
                } else {
                    fetchTemplates();
                    handleClose();
                }
            } else {
                toast.error(data.error || "Failed to save template");
            }
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Failed to save template");
        }
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

    const handleCopyAllPlaceholders = () => {
        const text = Object.entries(DOCUMENT_PLACEHOLDERS)
            .map(([_, meta]) => `{{${meta.path}}}  <!-- ${meta.label} -->`)
            .join('\n');
        navigator.clipboard.writeText(text);
        toast.success(`Copied all ${Object.keys(DOCUMENT_PLACEHOLDERS).length} placeholders to clipboard!`);
    };

    // Fullscreen 3-column + Artifact View Mode Editor
    if (showEditor) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden select-none">
                {/* ─── Top Header Bar ─── */}
                <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-20">
                    {/* Left: Back button + Title */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer border border-slate-200"
                        >
                            <ArrowLeft size={15} />
                            <span>Back to Templates</span>
                        </button>

                        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Settings size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                                    {editingId ? "Modify Template" : "Draft New Template"}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                                    HTML TEMPLATE MODE
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Center: Agentic IDE Artifact View Mode Toggle [ Code | Split | Preview ] */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode("code")}
                            className={cn(
                                "px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                                viewMode === "code"
                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                            title="Code only view"
                        >
                            <Code2 size={13} />
                            <span>Code</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("split")}
                            className={cn(
                                "px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                                viewMode === "split"
                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                            title="Split view (Side-by-side)"
                        >
                            <Columns size={13} />
                            <span>Split</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("preview")}
                            className={cn(
                                "px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                                viewMode === "preview"
                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                            title="Live preview view"
                        >
                            <Eye size={13} />
                            <span>Preview</span>
                        </button>
                    </div>

                    {/* Right: Zoom controls, Save button, and close X */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-2 py-1 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setZoom(Math.max(50, zoom - 10))}
                                className="p-1 hover:bg-slate-200/60 rounded text-slate-600 cursor-pointer"
                                title="Zoom out"
                            >
                                <ZoomOut size={13} />
                            </button>
                            <span className="text-[11px] font-mono font-semibold text-slate-700 min-w-[36px] text-center">
                                {zoom}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom(Math.min(200, zoom + 10))}
                                className="p-1 hover:bg-slate-200/60 rounded text-slate-600 cursor-pointer"
                                title="Zoom in"
                            >
                                <ZoomIn size={13} />
                            </button>
                        </div>

                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            className="flex items-center gap-1.5"
                        >
                            <Check size={14} />
                            <span>{editingId ? "Update Template" : "Create Template"}</span>
                        </Button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Close editor"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {/* ─── Body Area: 3 Columns ─── */}
                <div className="flex-1 min-h-0 flex overflow-hidden">
                    {/* COLUMN 1: Settings Panel (ALWAYS on the left) */}
                    <aside className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between overflow-hidden">
                        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                            {/* Template Name */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Template Name
                                </label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Bonafide Certificate"
                                    className="w-full text-sm font-medium"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Category
                                </label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                                >
                                    <option value="GENERAL">General Template</option>
                                    <option value="BONAFIDE">Bonafide Certificate</option>
                                    <option value="LEAVING_CERTIFICATE">Leaving Certificate</option>
                                    <option value="TRANSFER_CERTIFICATE">Transfer Certificate</option>
                                </select>
                            </div>

                            {/* Load Preset */}
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Star size={12} className="text-amber-500" />
                                    <span>Load Preset</span>
                                </p>
                                <div className="space-y-2">
                                    {Object.values(FORMAL_TEMPLATES).map(t => (
                                        <button
                                            key={t.category}
                                            type="button"
                                            onClick={() => loadPreset(t)}
                                            className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-900 hover:shadow-sm transition-all group cursor-pointer"
                                        >
                                            <span className="text-xs font-semibold text-slate-800 block truncate">
                                                {t.name}
                                            </span>
                                            <span className="text-[10px] text-blue-600 font-medium group-hover:underline inline-block mt-0.5">
                                                Click to load →
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Page Setup */}
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Maximize size={12} />
                                    <span>Page Setup</span>
                                </p>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-lg border border-slate-200">
                                    {['portrait', 'landscape'].map(orient => (
                                        <button
                                            key={orient}
                                            type="button"
                                            onClick={() => setForm({ ...form, pageConfig: { ...form.pageConfig, orientation: orient } })}
                                            className={cn(
                                                "py-2 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer",
                                                form.pageConfig.orientation === orient
                                                    ? "bg-slate-900 text-white shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                            )}
                                        >
                                            {orient}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions of Left Column */}
                        <div className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleSave}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                <span>{editingId ? "Update Template" : "Create Template"}</span>
                            </Button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center transition-colors cursor-pointer"
                            >
                                Discard Changes
                            </button>
                        </div>
                    </aside>

                    {/* ─── RIGHT WORKSPACE (Columns 2 & 3 with Toggle) ─── */}
                    <div className="flex-1 min-w-0 flex overflow-hidden">
                        {/* COLUMN 2: Code Editor */}
                        {(viewMode === "code" || viewMode === "split") && (
                            <div className={cn(
                                "min-w-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden",
                                viewMode === "code" ? "w-full" : "w-1/2"
                            )}>
                                {/* Code Tabs Header */}
                                <div className="h-11 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-1">
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
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                                                    activeTab === tab.id
                                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                                        : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                <tab.icon size={13} />
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Code Tab Content */}
                                <div className="flex-1 min-h-0 overflow-auto">
                                    {activeTab === "html" && (
                                        <textarea
                                            value={form.htmlTemplate}
                                            onChange={e => setForm({ ...form, htmlTemplate: e.target.value })}
                                            className="w-full h-full p-5 font-mono text-xs leading-relaxed resize-none outline-none bg-slate-50/40 text-slate-800"
                                            placeholder="Enter Handlebars HTML template..."
                                            spellCheck={false}
                                        />
                                    )}
                                    {activeTab === "css" && (
                                        <textarea
                                            value={form.cssContent}
                                            onChange={e => setForm({ ...form, cssContent: e.target.value })}
                                            className="w-full h-full p-5 font-mono text-xs leading-relaxed resize-none outline-none bg-slate-50/40 text-slate-800"
                                            placeholder="Enter CSS styles..."
                                            spellCheck={false}
                                        />
                                    )}
                                    {activeTab === "config" && (
                                        <div className="p-5 space-y-5 overflow-y-auto max-h-full">
                                            <div className="space-y-4">
                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Page Margins (mm)
                                                </h5>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['top', 'bottom', 'left', 'right'].map(m => (
                                                        <div key={m} className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-600 capitalize">
                                                                {m}
                                                            </label>
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
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    <span className="font-bold text-slate-800 block mb-1">A4 Standard Dimensions</span>
                                                    Portrait: 210mm × 297mm<br/>
                                                    Landscape: 297mm × 210mm<br/>
                                                    Margins are applied directly inside the canvas.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === "placeholders" && (
                                        <div className="p-5 space-y-3.5 h-full flex flex-col">
                                            {/* Banner with Copy All button */}
                                            <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 flex items-center justify-between gap-3 shrink-0">
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <Hash size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-blue-900 leading-tight">Dynamic Placeholders</p>
                                                        <p className="text-[11px] text-blue-700 mt-0.5 truncate">
                                                            Click any tag to copy, or use Copy All to copy everything.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyAllPlaceholders}
                                                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                                                >
                                                    <Copy size={13} />
                                                    <span>Copy All</span>
                                                </button>
                                            </div>

                                            {/* Search input for placeholders */}
                                            <div className="relative shrink-0">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={placeholderSearch}
                                                    onChange={e => setPlaceholderSearch(e.target.value)}
                                                    placeholder="Search placeholders (e.g. photo, name, class, roll)..."
                                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-slate-900 outline-none transition-all font-medium"
                                                />
                                            </div>

                                            {/* Filtered Placeholders Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                                {Object.entries(DOCUMENT_PLACEHOLDERS)
                                                    .filter(([_, meta]) => {
                                                        if (!placeholderSearch) return true;
                                                        const q = placeholderSearch.toLowerCase();
                                                        return meta.label.toLowerCase().includes(q) || meta.path.toLowerCase().includes(q) || (meta.category && meta.category.toLowerCase().includes(q));
                                                    })
                                                    .map(([key, meta]) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => handleCopyPlaceholder(meta.path)}
                                                            className="text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all group cursor-pointer flex flex-col justify-between"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 w-full">
                                                                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight truncate">
                                                                    {meta.label}
                                                                </span>
                                                                {meta.category && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium uppercase shrink-0">
                                                                        {meta.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <code className="text-xs text-blue-700 font-mono mt-1.5 block group-hover:text-blue-900">
                                                                {"{{"}{meta.path}{"}}"}
                                                            </code>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* COLUMN 3: Live Preview Canvas */}
                        {(viewMode === "preview" || viewMode === "split") && (
                            <div className={cn(
                                "min-w-0 flex flex-col bg-slate-200 relative overflow-hidden",
                                viewMode === "preview" ? "w-full" : "w-1/2"
                            )}>
                                {/* Blueprint Background Pattern */}
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

                                {/* Scaled Canvas Container */}
                                <div className="absolute inset-0 overflow-auto p-6 custom-scrollbar">
                                    <div style={{
                                        width: `calc(${form.pageConfig.orientation === 'portrait' ? '210mm' : '297mm'} * ${zoom / 100})`,
                                        height: `calc(${form.pageConfig.orientation === 'portrait' ? '297mm' : '210mm'} * ${zoom / 100} + 32px)`,
                                        margin: '0 auto',
                                    }}>
                                        <div 
                                            className="bg-white shadow-xl transition-all duration-300"
                                            style={{
                                                width: form.pageConfig.orientation === 'portrait' ? '210mm' : '297mm',
                                                height: form.pageConfig.orientation === 'portrait' ? '297mm' : '210mm',
                                                transform: `scale(${zoom / 100})`,
                                                transformOrigin: 'top left',
                                                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.06)'
                                            }}
                                        >
                                            <iframe
                                                srcDoc={getPreviewHtml()}
                                                className="w-full h-full border-none pointer-events-none"
                                                title="Certificate Live Preview"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Live Preview Floating Status Pill */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                                    <div className="flex gap-2 pointer-events-auto">
                                        <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-lg text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", previewData ? "bg-blue-400 animate-pulse" : "bg-emerald-400 animate-pulse")} />
                                            {previewData ? `Real Data: ${previewStudentName}` : 'Mock Data Preview'}
                                        </div>
                                        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm">
                                            {form.pageConfig.orientation} • A4
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchRandomStudent}
                                        disabled={loadingPreview}
                                        className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-lg text-slate-800 text-[10px] font-bold uppercase tracking-wider border border-slate-200 hover:bg-white hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm pointer-events-auto"
                                        title="Load a random student's real data"
                                    >
                                        {loadingPreview ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                        {previewData ? 'Next Student' : 'Use Real Data'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default template list view if rendered outside the modal/section
    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">HTML Certificate Templates</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Create formal certificates with HTML and Handlebars</p>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                        resetForm();
                        setShowEditor(true);
                    }}
                    className="flex items-center gap-1.5"
                >
                    <Plus size={15} />
                    <span>New Template</span>
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin text-slate-900" size={28} />
                </div>
            ) : templates.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-500">No HTML templates yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <div key={template._id} className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                            <h4 className="font-bold text-slate-900 truncate">{template.name}</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                {(template.category || 'GENERAL').replace(/_/g, ' ')}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditingId(template._id);
                                    setForm(template);
                                    setShowEditor(true);
                                }}
                                className="w-full flex items-center justify-center gap-1.5"
                            >
                                <Edit size={14} />
                                <span>Edit</span>
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
