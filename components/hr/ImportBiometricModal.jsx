"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    Upload, 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertTriangle, 
    X, 
    Loader2, 
    Info, 
    ArrowRight, 
    Archive, 
    FileText,
    ShieldAlert
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function ImportBiometricModal({ isOpen, onClose, onSuccess }) {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [overwriteManual, setOverwriteManual] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStage, setUploadStage] = useState(0); // 0: Uploading, 1: Extracting, 2: Parsing, 3: Syncing
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const isSupportedFile = (name) => {
        const lower = (name || "").toLowerCase();
        return lower.endsWith(".rar") || 
               lower.endsWith(".zip") || 
               lower.endsWith(".pdf") || 
               lower.endsWith(".xls") || 
               lower.endsWith(".xlsx");
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (isSupportedFile(selected.name)) {
                setFile(selected);
                setError("");
                setResult(null);
            } else {
                setError("Please select a supported biometric archive (.rar, .zip) or file (.pdf, .xls, .xlsx).");
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && isSupportedFile(dropped.name)) {
            setFile(dropped);
            setError("");
            setResult(null);
        } else {
            setError("Please upload a .rar, .zip, .pdf, or Excel (.xls, .xlsx) file.");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first (.rar, .zip, .pdf, or Excel).");
            return;
        }

        setUploading(true);
        setError("");
        setUploadStage(0);

        // Friendly progressive stage timer
        const timer1 = setTimeout(() => setUploadStage(1), 300);
        const timer2 = setTimeout(() => setUploadStage(2), 700);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("overwriteManual", String(overwriteManual));

            const res = await fetch("/api/v1/hr/attendance/import", {
                method: "POST",
                body: formData
            });

            clearTimeout(timer1);
            clearTimeout(timer2);

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to process attendance file");
            }

            setResult(data);
            if (onSuccess) onSuccess(data);
        } catch (err) {
            setError(err.message || "Failed to upload and parse file.");
        } finally {
            setUploading(false);
            setUploadStage(0);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        setError("");
        setOverwriteManual(false);
        onClose();
    };

    const getFileIcon = (fileName) => {
        const lower = (fileName || "").toLowerCase();
        if (lower.endsWith(".rar") || lower.endsWith(".zip")) {
            return <Archive size={20} />;
        }
        if (lower.endsWith(".pdf")) {
            return <FileText size={20} />;
        }
        return <FileSpreadsheet size={20} />;
    };

    const getStageText = () => {
        switch (uploadStage) {
            case 0: return "Uploading file to server…";
            case 1: return "Decompressing archive & detecting In/Out logs…";
            case 2: return "Parsing daily timestamps & matching staff…";
            default: return "Processing biometric records…";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                            <Archive size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Import Biometric Attendance</h2>
                            <p className="text-[11px] text-slate-500">Upload .rar archives, In/Out PDFs, or Excel reports</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Close"
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
                                        ? "border-indigo-400 bg-indigo-50/30"
                                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".rar,.zip,.pdf,.xls,.xlsx,application/vnd.rar,application/x-rar-compressed,application/zip,application/pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="space-y-1">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                                            {getFileIcon(file.name)}
                                        </div>
                                        <p className="text-xs font-bold text-slate-800">{file.name}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {(file.size / 1024).toFixed(1)} KB · Click to choose different file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                                            <Upload size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">Click to choose or drag & drop</p>
                                        <p className="text-[11px] text-slate-400">
                                            Supports WinRAR archives (<strong>.rar</strong>), Zip (<strong>.zip</strong>), In/Out PDFs (<strong>.pdf</strong>), and Excel
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Overwrite Manual Edits Option */}
                            <div className="flex items-center gap-2 px-1">
                                <input
                                    type="checkbox"
                                    id="overwriteManual"
                                    checked={overwriteManual}
                                    onChange={(e) => setOverwriteManual(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                />
                                <label htmlFor="overwriteManual" className="text-xs text-slate-600 select-none cursor-pointer">
                                    Overwrite manually corrected records (disabled by default)
                                </label>
                            </div>

                            {/* Info Box */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <Info size={13} className="text-indigo-600" />
                                    <span>Supported Biometric Reports</span>
                                </div>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                                    <li><strong>WinRAR Archives (.rar)</strong> — e.g. <code>Aug Att 2026.rar</code> with In/Out PDF inside</li>
                                    <li><strong>Monthly In/Out PDF Report</strong> — e.g. <code>Aug Att in Out.pdf</code> (extracts exact punch times)</li>
                                    <li><strong>Monthly Attendance Summary</strong> — e.g. <code>Att Aug 2026.xls</code></li>
                                </ul>
                                <p className="text-[10px] text-slate-400 pt-1">
                                    Staff are matched via Biometric ID. Missing codes will be safely matched by name and auto-linked.
                                </p>
                            </div>

                            {/* Loading State Feedback */}
                            {uploading && (
                                <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse">
                                    <Loader2 size={16} className="text-indigo-600 animate-spin shrink-0" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-indigo-900">{getStageText()}</p>
                                        <p className="text-[10px] text-indigo-600">Please do not close this window</p>
                                    </div>
                                </div>
                            )}

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
                                    <h3 className="text-xs font-bold text-emerald-900">Attendance Synced Successfully!</h3>
                                    <p className="text-[11px] text-emerald-700 mt-0.5">
                                        Period: <strong>{result.period}</strong>
                                    </p>
                                    {result.notice && (
                                        <p className="text-[10px] text-amber-700 mt-1 bg-amber-50/80 p-1.5 rounded border border-amber-200/60">
                                            ℹ️ {result.notice}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Warning if Payslips already exist */}
                            {result.payslipWarning && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                                    <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-900">Existing Payslips Detected</p>
                                        <p className="text-[11px] text-amber-700 mt-0.5">{result.payslipWarning}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Staff Matched</span>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{result.matchedStaffCount}</p>
                                    {result.autoBoundCount > 0 && (
                                        <span className="text-[10px] text-emerald-600 font-medium">
                                            ({result.autoBoundCount} auto-linked)
                                        </span>
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Recorded</span>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{result.totalRecordsImported}</p>
                                </div>
                            </div>

                            {/* Unmatched Staff List with reasons */}
                            {result.unmatchedCount > 0 && (
                                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                        <AlertTriangle size={14} />
                                        <span>{result.unmatchedCount} Unmatched Staff from File</span>
                                    </div>
                                    <p className="text-[11px] text-amber-700">
                                        The following employee codes could not be automatically matched. You can assign their Biometric ID in the Staff Directory:
                                    </p>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {result.unmatchedStaff?.map((s, idx) => (
                                            <div key={idx} className="bg-white/90 border border-amber-200 p-2 rounded-lg flex items-center justify-between text-[11px]">
                                                <div>
                                                    <span className="font-bold text-slate-800">{s.name || "Unknown"}</span>
                                                    <span className="text-slate-400 ml-1.5">(Code: {s.code})</span>
                                                    {s.reason && (
                                                        <p className="text-[10px] text-amber-600 mt-0.5">{s.reason}</p>
                                                    )}
                                                </div>
                                            </div>
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
                            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={uploading}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={!file || uploading}
                                onClick={handleUpload}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                            >
                                {uploading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Upload size={13} className="mr-1.5" />}
                                {uploading ? "Processing…" : "Upload & Sync"}
                            </Button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                                Done
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    handleClose();
                                    router.push(`/admin/hr/payslips?month=${result.month || 8}&year=${result.year || 2026}`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>Go to Payslips</span>
                                <ArrowRight size={13} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
