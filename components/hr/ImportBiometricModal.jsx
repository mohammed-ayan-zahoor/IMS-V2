"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Loader2, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function ImportBiometricModal({ isOpen, onClose, onSuccess }) {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError("");
            setResult(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && (dropped.name.endsWith(".xls") || dropped.name.endsWith(".xlsx"))) {
            setFile(dropped);
            setError("");
            setResult(null);
        } else {
            setError("Please upload an Excel file (.xls or .xlsx)");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select an Excel file first.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/v1/hr/attendance/import", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Import failed");
            }

            setResult(data);
            if (onSuccess) onSuccess(data);
        } catch (err) {
            setError(err.message || "Failed to upload and parse file.");
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        setError("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Import Biometric Attendance</h2>
                            <p className="text-[11px] text-slate-500">Upload ONtime / Secureye Excel reports</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {!result ? (
                        <>
                            {/* Drag and Drop Zone */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                                    file
                                        ? "border-emerald-400 bg-emerald-50/30"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="space-y-1">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                            <FileSpreadsheet size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-800">{file.name}</p>
                                        <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to change file</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                                            <Upload size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">Click to choose or drag & drop</p>
                                        <p className="text-[11px] text-slate-400">Supports ONtime Excel reports (.xls or .xlsx)</p>
                                    </div>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <Info size={13} className="text-indigo-600" />
                                    <span>Supported Reports</span>
                                </div>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                                    <li><strong>Monthly Attendance Report (Summary)</strong> — e.g. <code>Att Aug 2026.xls</code></li>
                                    <li><strong>Monthly Attendance with In/Out Time</strong></li>
                                </ul>
                                <p className="text-[10px] text-slate-400 pt-0.5">Staff are matched automatically by Biometric ID or staff name.</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                                    <AlertTriangle size={15} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Success View */
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-xs font-bold text-emerald-900">Attendance Imported Successfully!</h3>
                                    <p className="text-[11px] text-emerald-700 mt-0.5">
                                        Period: <strong>{result.period}</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Staff Matched</span>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{result.matchedStaffCount}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Recorded</span>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{result.totalRecordsImported}</p>
                                </div>
                            </div>

                            {result.unmatchedCount > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                        <AlertTriangle size={13} />
                                        <span>{result.unmatchedCount} Unmatched from File</span>
                                    </div>
                                    <p className="text-[11px] text-amber-700">
                                        These codes were in the Excel sheet but haven&apos;t been assigned in Staff Directory yet:
                                    </p>
                                    <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                                        {result.unmatchedStaff?.map((s, idx) => (
                                            <span key={idx} className="bg-white border border-amber-300 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                                                ID {s.code} {s.name ? `(${s.name})` : ""}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                    {!result ? (
                        <>
                            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={!file || uploading}
                                onClick={handleUpload}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {uploading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Upload size={13} className="mr-1.5" />}
                                {uploading ? "Importing…" : "Upload & Sync"}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" size="sm" onClick={handleClose} className="bg-slate-800 text-white">
                            Done
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
