"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    X, 
    Award, 
    FileText, 
    Calendar, 
    AlertCircle, 
    CheckCircle2, 
    Loader,
    ChevronRight,
    Search,
    RefreshCw,
    Download,
    Eye
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import Handlebars from "handlebars";

// Register custom helpers for frontend preview consistency
try {
    Handlebars.registerHelper('formatDate', (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    });

    Handlebars.registerHelper('toUpperCase', (str) => {
        return typeof str === 'string' ? str.toUpperCase() : str;
    });
} catch (e) {
    // Helper might already be registered in HMR
}

/**
 * DocumentIssuanceDialog
 * Handles the actual generation step for formal documents (LC, TC, etc.)
 */
const DocumentIssuanceDialog = ({ 
    isOpen, 
    onClose, 
    student, 
    template: initialTemplate,
    templates = [],
    onSuccess 
}) => {
    const toast = useToast();
    const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [hydratedContext, setHydratedContext] = useState(null);
    const [metadata, setMetadata] = useState({
        leavingReason: "",
        conduct: "Good",
        progress: "Satisfactory",
        academicYear: new Date().getFullYear().toString()
    });

    const [issueMode, setIssueMode] = useState("ISSUE"); // ISSUE or REPRINT
    const [isDuplicate, setIsDuplicate] = useState(false);

    // Sync internal state when prop changes
    useEffect(() => {
        if (initialTemplate) {
            setSelectedTemplate(initialTemplate);
        }
    }, [initialTemplate]);

    // Fetch hydration context for preview
    const fetchPreview = async () => {
        if (!student?._id || !selectedTemplate?._id) return;
        
        try {
            setPreviewLoading(true);
            const params = new URLSearchParams({
                templateId: selectedTemplate._id,
                leavingReason: metadata.leavingReason,
                conduct: metadata.conduct,
                progress: metadata.progress,
                academicYear: metadata.academicYear
            });

            const res = await fetch(`/api/v1/students/${student._id}/certificate-preview?${params.toString()}`);
            const result = await res.json();
            
            if (res.ok) {
                setHydratedContext(result.data);
            } else {
                toast.error(result.error || "Failed to load preview");
            }
        } catch (error) {
            console.error("Preview Error:", error);
            toast.error("Error connecting to preview service");
        } finally {
            setPreviewLoading(false);
        }
    };

    // Initial preview fetch
    useEffect(() => {
        if (isOpen && student && selectedTemplate) {
            fetchPreview();
        }
    }, [isOpen, student, selectedTemplate]);

    // Handle Issue
    const handleIssue = async () => {
        if (!selectedTemplate) {
            toast.error("Please select a template first");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/v1/students/bulk-generate-certificates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: [student._id],
                    templateId: selectedTemplate._id,
                    metadata: metadata,
                    isDuplicate: isDuplicate,
                    batchId: student.batchId?._id || student.batchId || null
                })
            });

            const result = await res.json();

            if (res.ok) {
                toast.success("Certificate issued successfully!");
                onSuccess?.(result.certificates[0]);
                
                // If it was successful, trigger the download for the user automatically
                if (result.certificates?.[0]?.certificateId) {
                    window.open(`/api/v1/students/certificates/${result.certificates[0].certificateId}/download`, '_blank');
                }
                
                onClose();
            } else {
                toast.error(result.error || "Issuance failed");
            }
        } catch (error) {
            console.error("Issue Error:", error);
            toast.error("Error issuing certificate");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-premium-blue/10 flex items-center justify-center">
                            <Award className="text-premium-blue" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Issue {selectedTemplate?.category?.replace(/_/g, ' ') || 'Document'}</h2>
                            <p className="text-sm text-slate-500 font-medium">Student: <span className="text-slate-900">{student?.name}</span></p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Form */}
                    <div className="w-[350px] border-r border-slate-100 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                        {/* Section: Template Selection */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Award size={14} />
                                Select Template
                            </h3>
                            <div className="space-y-1.5">
                                <select 
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-premium-blue outline-none text-sm font-medium transition-all shadow-sm"
                                    value={selectedTemplate?._id || ""}
                                    onChange={e => {
                                        const newTemplate = templates.find(t => t._id === e.target.value);
                                        setSelectedTemplate(newTemplate);
                                        // fetchPreview will be triggered by useEffect
                                    }}
                                >
                                    <option value="" disabled>Choose a template...</option>
                                    {templates.map(t => (
                                        <option key={t._id} value={t._id}>
                                            {t.name} ({t.category?.replace(/_/g, ' ')})
                                        </option>
                                    ))}
                                </select>
                                {selectedTemplate && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-[10px] font-bold">
                                        <CheckCircle2 size={12} />
                                        {selectedTemplate.renderMode?.replace('_', ' ')} Mode
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section: Metadata */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} />
                                Document Details
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Reason for Leaving</label>
                                    <Input 
                                        placeholder="e.g. Completed Course"
                                        value={metadata.leavingReason}
                                        onChange={e => setMetadata({ ...metadata, leavingReason: e.target.value })}
                                        onBlur={fetchPreview}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Conduct</label>
                                    <select 
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-premium-blue outline-none text-sm font-medium transition-all"
                                        value={metadata.conduct}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setMetadata({ ...metadata, conduct: val });
                                            setTimeout(fetchPreview, 0);
                                        }}
                                    >
                                        <option value="Good">Good</option>
                                        <option value="Very Good">Very Good</option>
                                        <option value="Excellent">Excellent</option>
                                        <option value="Satisfactory">Satisfactory</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Progress</label>
                                    <Input 
                                        placeholder="e.g. Satisfactory"
                                        value={metadata.progress}
                                        onChange={e => setMetadata({ ...metadata, progress: e.target.value })}
                                        onBlur={fetchPreview}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Options */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={14} />
                                Issuance Options
                            </h3>
                            
                            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Mark as Duplicate</p>
                                        <p className="text-[10px] text-slate-500">Adds 'DUPLICATE' watermark</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIsDuplicate(!isDuplicate);
                                            setTimeout(fetchPreview, 0);
                                        }}
                                        className={cn(
                                            "w-10 h-5 rounded-full transition-all relative",
                                            isDuplicate ? "bg-premium-blue" : "bg-slate-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                            isDuplicate ? "right-1" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Warning Box */}
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                            <div className="flex gap-3">
                                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                    Issuing this document will consume a new sequential serial number. Please verify all details in the preview before proceeding.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="flex-1 bg-slate-200 overflow-auto p-12 flex flex-col items-center relative">
                        {previewLoading && (
                            <div className="absolute inset-0 z-10 bg-slate-900/5 backdrop-blur-[2px] flex items-center justify-center">
                                <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3">
                                    <Loader className="animate-spin text-premium-blue" size={20} />
                                    <span className="text-sm font-bold text-slate-700">Updating Preview...</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-white shadow-2xl origin-top transition-all"
                             style={{ 
                                width: selectedTemplate?.pageConfig?.orientation === 'portrait' ? '210mm' : '297mm',
                                minHeight: selectedTemplate?.pageConfig?.orientation === 'portrait' ? '297mm' : '210mm',
                                transform: 'scale(0.8)'
                             }}>
                            {hydratedContext ? (
                                <iframe
                                    className="w-full h-full border-none"
                                    style={{ 
                                        width: selectedTemplate?.pageConfig?.orientation === 'portrait' ? '210mm' : '297mm',
                                        height: selectedTemplate?.pageConfig?.orientation === 'portrait' ? '297mm' : '210mm',
                                    }}
                                    title="Issuance Preview"
                                    srcDoc={`
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <meta charset="UTF-8">
                                            <style>
                                                html, body { 
                                                    margin: 0; 
                                                    padding: 0; 
                                                    background: white; 
                                                    width: 100%;
                                                    height: 100%;
                                                    -webkit-print-color-adjust: exact; 
                                                }
                                                .page {
                                                    position: relative;
                                                    width: ${selectedTemplate?.pageConfig?.orientation === 'portrait' ? '210mm' : '297mm'};
                                                    height: ${selectedTemplate?.pageConfig?.orientation === 'portrait' ? '297mm' : '210mm'};
                                                    padding: ${selectedTemplate?.pageConfig?.margins?.top || 15}mm ${selectedTemplate?.pageConfig?.margins?.right || 15}mm ${selectedTemplate?.pageConfig?.margins?.bottom || 15}mm ${selectedTemplate?.pageConfig?.margins?.left || 15}mm;
                                                    box-sizing: border-box;
                                                    overflow: hidden;
                                                    background: white;
                                                }
                                                ${selectedTemplate?.cssContent || ''}
                                                @page {
                                                    size: ${selectedTemplate?.pageConfig?.size || 'A4'} ${selectedTemplate?.pageConfig?.orientation || 'portrait'};
                                                    margin: 0;
                                                }
                                                .duplicate-mark {
                                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                                                    font-size: 120px; color: rgba(0,0,0,0.1); pointer-events: none; z-index: 999;
                                                    font-weight: bold; white-space: nowrap; font-family: sans-serif;
                                                }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="page">
                                                ${(() => {
                                                    try {
                                                        const templateFn = Handlebars.compile(selectedTemplate?.htmlTemplate || "");
                                                        return templateFn(hydratedContext || {});
                                                    } catch (err) {
                                                        return `<div style="color:red; padding:20px; font-family:sans-serif;">
                                                            <strong>Template Error:</strong> ${err.message}
                                                        </div>`;
                                                    }
                                                })()}
                                                ${isDuplicate ? '<div class="duplicate-mark">DUPLICATE</div>' : ''}
                                            </div>
                                        </body>
                                        </html>
                                    `}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                    <FileText size={48} strokeWidth={1} />
                                    <p className="font-medium">Initializing Preview...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Search size={16} />
                        <span className="text-xs font-medium italic">Preview is generated using live institute data</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="bg-premium-blue hover:bg-premium-blue/90 min-w-[200px]"
                            onClick={handleIssue}
                            disabled={loading || !hydratedContext}
                            icon={loading ? <Loader className="animate-spin" size={18} /> : <Award size={18} />}
                        >
                            {loading ? "Issuing..." : `Issue & Save Document`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentIssuanceDialog;
