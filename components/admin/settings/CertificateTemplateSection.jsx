"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Code2, Image as ImageIcon } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import CertificateTemplateList from "./CertificateTemplateList";
import CertificateTemplateManager from "@/components/admin/CertificateTemplateManager";
import HtmlCertificateEditor from "@/components/admin/HtmlCertificateEditor";

export default function CertificateTemplateSection({ onTemplateChange }) {
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for modal choice and editing mode
    const [isTypeChooserOpen, setIsTypeChooserOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null); // { type: "html" | "image", template: object | null }

    // State for deletion
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/v1/certificate-templates");
            if (!res.ok) {
                throw new Error(`Failed to load templates (HTTP ${res.status})`);
            }
            const data = await res.json();
            if (data.success) {
                const list = data.data || [];
                setTemplates(list);
                if (onTemplateChange) onTemplateChange(list);
            } else {
                throw new Error(data.error || "Could not retrieve certificate templates");
            }
        } catch (err) {
            console.error("Fetch templates error:", err);
            setError(err.message || "Failed to load certificate templates.");
        } finally {
            setLoading(false);
        }
    }, [onTemplateChange]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleEdit = (template) => {
        const isHtml = template.renderMode === "HTML_TEMPLATE";
        setEditingTemplate({
            type: isHtml ? "html" : "image",
            template
        });
    };

    const handleDeleteRequest = (template) => {
        setTemplateToDelete(template);
    };

    const handleConfirmDelete = async () => {
        if (!templateToDelete?._id) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/v1/certificate-templates/${templateToDelete._id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Template "${templateToDelete.name}" deleted successfully`);
                setTemplateToDelete(null);
                fetchTemplates();
            } else {
                toast.error(data.error || "Failed to delete template");
            }
        } catch (err) {
            console.error("Delete template error:", err);
            toast.error("Failed to delete template");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section aria-labelledby="certificate-templates-heading" className="space-y-6">
            <SectionHeader
                title="Certificate Templates"
                description="Design and manage certificate layouts for student issuance."
                action={
                    !editingTemplate && (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setIsTypeChooserOpen(true)}
                            className="flex items-center gap-1.5"
                        >
                            <Plus size={15} />
                            <span>New Template</span>
                        </Button>
                    )
                }
            />

            {/* Template Editing Surface */}
            {editingTemplate ? (
                <div className="space-y-4">
                    {editingTemplate.type === "html" ? (
                        <HtmlCertificateEditor
                            initialEditingTemplate={editingTemplate.template}
                            isOpen
                            onClose={() => {
                                setEditingTemplate(null);
                                fetchTemplates();
                            }}
                            onSaveSuccess={() => {
                                setEditingTemplate(null);
                                fetchTemplates();
                            }}
                        />
                    ) : (
                        <CertificateTemplateManager
                            initialEditingTemplate={editingTemplate.template}
                            isOpen
                            onClose={() => {
                                setEditingTemplate(null);
                                fetchTemplates();
                            }}
                            onSaveSuccess={() => {
                                setEditingTemplate(null);
                                fetchTemplates();
                            }}
                        />
                    )}
                </div>
            ) : (
                /* Unified Template Cards Grid */
                <CertificateTemplateList
                    templates={templates}
                    loading={loading}
                    error={error}
                    onRetry={fetchTemplates}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                    onCreateNew={() => setIsTypeChooserOpen(true)}
                />
            )}

            {/* Type Chooser Modal */}
            <Modal
                isOpen={isTypeChooserOpen}
                onClose={() => setIsTypeChooserOpen(false)}
                title="Choose Template Type"
            >
                <div className="space-y-3 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setIsTypeChooserOpen(false);
                            setEditingTemplate({ type: "html", template: null });
                        }}
                        className="w-full p-4 rounded-lg border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-50/50 text-left transition-colors flex items-start gap-3.5 group cursor-pointer"
                    >
                        <div className="p-2.5 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                            <Code2 size={20} />
                        </div>
                        <div>
                            <span className="block text-sm font-semibold text-slate-900">
                                HTML Certificate Template
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                                Create formal certificates with HTML, CSS styling, and dynamic student data.
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsTypeChooserOpen(false);
                            setEditingTemplate({ type: "image", template: null });
                        }}
                        className="w-full p-4 rounded-lg border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-50/50 text-left transition-colors flex items-start gap-3.5 group cursor-pointer"
                    >
                        <div className="p-2.5 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <span className="block text-sm font-semibold text-slate-900">
                                Image-based Certificate Template
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                                Upload a certificate design image and position text placeholders on the canvas.
                            </span>
                        </div>
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={Boolean(templateToDelete)}
                title="Delete Certificate Template"
                message={`Are you sure you want to delete "${templateToDelete?.name}"? This template will no longer be available for student issuance.`}
                confirmText={isDeleting ? "Deleting..." : "Delete Template"}
                type="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setTemplateToDelete(null)}
            />
        </section>
    );
}
