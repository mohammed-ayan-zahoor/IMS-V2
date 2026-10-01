"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function ReceiptUploadZone({
    attachments = [],
    onChange,
    maxFiles = 5,
    disabled = false
}) {
    const toast = useToast();
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const filesArray = Array.from(selectedFiles);
        const currentCount = attachments.length;

        if (currentCount + filesArray.length > maxFiles) {
            toast.error(`You can attach a maximum of ${maxFiles} receipts per entry (currently ${currentCount}).`);
            return;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
        const invalid = filesArray.find(f => !validTypes.includes(f.type));
        if (invalid) {
            toast.error(`"${invalid.name}" is not a supported format. Please upload JPG, PNG, WEBP, or PDF.`);
            return;
        }

        const oversized = filesArray.find(f => f.size > 10 * 1024 * 1024);
        if (oversized) {
            toast.error(`"${oversized.name}" exceeds the 10MB limit.`);
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            filesArray.forEach(file => {
                formData.append("files", file);
            });

            const res = await fetch("/api/v1/finance/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const updated = [...attachments, ...data.attachments];
                onChange(updated);
                toast.success(`${data.attachments.length} ${data.attachments.length === 1 ? 'receipt' : 'receipts'} attached`);
            } else {
                toast.error(data.error || "Failed to upload attachments");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Network error during receipt upload");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemove = (indexToRemove) => {
        const updated = attachments.filter((_, idx) => idx !== indexToRemove);
        onChange(updated);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud size={14} className="text-slate-400" />
                    Receipts & Invoices (Optional)
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                    {attachments.length} / {maxFiles} files
                </span>
            </div>

            {/* Drop Zone */}
            {attachments.length < maxFiles && (
                <div
                    onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (!disabled && !uploading) handleFiles(e.dataTransfer.files);
                    }}
                    onClick={() => {
                        if (!disabled && !uploading && fileInputRef.current) {
                            fileInputRef.current.click();
                        }
                    }}
                    className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragging 
                            ? "border-blue-500 bg-blue-50/50 scale-[0.99]" 
                            : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
                    } ${disabled || uploading ? "opacity-60 pointer-events-none" : ""}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                        disabled={disabled || uploading}
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <Loader2 size={24} className="text-blue-600 animate-spin" />
                            <p className="text-xs font-semibold text-slate-600">Uploading receipts securely…</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-500">
                                <UploadCloud size={20} />
                            </div>
                            <p className="text-xs font-semibold text-slate-700 mt-1">
                                Click or drag receipts / bills here
                            </p>
                            <p className="text-[11px] text-slate-400">
                                JPG, PNG, WEBP, or PDF up to 10MB each
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Thumbnail Cards Grid */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {attachments.map((att, idx) => {
                        const isPdf = att.mimeType === "application/pdf" || att.filename?.endsWith(".pdf");
                        return (
                            <div
                                key={att.filename || idx}
                                className="group relative rounded-xl border border-slate-200 bg-white p-2 shadow-xs flex flex-col justify-between overflow-hidden hover:border-slate-300 transition-all"
                            >
                                <div className="aspect-[4/3] w-full rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden relative">
                                    {isPdf ? (
                                        <div className="flex flex-col items-center gap-1 text-rose-500">
                                            <FileText size={28} />
                                            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded text-rose-600">
                                                PDF
                                            </span>
                                        </div>
                                    ) : (
                                        <img
                                            src={att.url}
                                            alt={att.originalName || "Receipt"}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement.innerHTML = '<span class="text-slate-300 text-xs">Preview</span>';
                                            }}
                                        />
                                    )}

                                    {/* Delete Button */}
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(idx);
                                            }}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
                                            title="Remove receipt"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2 px-1">
                                    <p className="text-[11px] font-semibold text-slate-700 truncate" title={att.originalName}>
                                        {att.originalName || `Receipt ${idx + 1}`}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {formatFileSize(att.size)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
