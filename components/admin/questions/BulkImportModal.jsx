"use client";

import { useState, useRef } from "react";
import { Upload, FileJson, X, CheckCircle, AlertTriangle, Download, Info, Loader2, ClipboardPaste } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_JSON = [
    {
        text: "What is the capital of France?",
        type: "mcq",
        difficulty: "easy",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
        marks: 1,
        explanation: "Paris is the capital and largest city of France.",
        tags: ["geography", "europe"]
    },
    {
        text: "The Earth revolves around the Sun.",
        type: "true_false",
        difficulty: "easy",
        correctAnswer: "true",
        marks: 1,
        explanation: "The Earth orbits the Sun in an elliptical path."
    },
    {
        text: "Explain the process of photosynthesis.",
        type: "short_answer",
        difficulty: "medium",
        correctAnswer: "Photosynthesis is the process by which green plants convert sunlight, water, and carbon dioxide into glucose and oxygen.",
        marks: 3,
        tags: ["biology", "plants"]
    }
];

export default function BulkImportModal({ isOpen, onClose, courses = [], batches = [], onImportComplete }) {
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: result
    const [jsonData, setJsonData] = useState(null);
    const [fileName, setFileName] = useState("");
    const [parseError, setParseError] = useState("");
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const [courseId, setCourseId] = useState("");
    const [batchId, setBatchId] = useState("");
    const [inputMode, setInputMode] = useState("file"); // "file" or "paste"
    const [pasteText, setPasteText] = useState("");

    const filteredBatches = courseId
        ? batches.filter(b => String(b.course?._id || b.course) === String(courseId))
        : [];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            setParseError("Only .json files are accepted.");
            return;
        }

        setFileName(file.name);
        setParseError("");

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const questions = Array.isArray(parsed) ? parsed : parsed.questions;

                if (!Array.isArray(questions) || questions.length === 0) {
                    setParseError("JSON must be an array of questions, or an object with a 'questions' array.");
                    return;
                }

                if (questions.length > 500) {
                    setParseError(`Too many questions (${questions.length}). Maximum is 500 per import.`);
                    return;
                }

                setJsonData(questions);
                setStep(2);
            } catch (err) {
                setParseError(`Invalid JSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!jsonData) return;
        setImporting(true);

        try {
            const res = await fetch("/api/v1/questions/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questions: jsonData,
                    courseId: courseId || undefined,
                    batchId: batchId || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Import failed");
                setImporting(false);
                return;
            }

            onImportComplete?.();

            if (data.summary.failed === 0) {
                toast.success(`Successfully imported ${data.summary.imported} questions!`);
                // Auto-close on full success
                setTimeout(() => handleClose(), 600);
            } else {
                // Show results with errors for review
                setResult(data);
                setStep(3);
                toast.warning(`Imported ${data.summary.imported}/${data.summary.total} questions. ${data.summary.failed} failed.`);
            }
        } catch (err) {
            toast.error("Network error during import");
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadSample = () => {
        const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sample_questions.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePasteSubmit = () => {
        setParseError("");
        try {
            const parsed = JSON.parse(pasteText);
            const questions = Array.isArray(parsed) ? parsed : parsed.questions;

            if (!Array.isArray(questions) || questions.length === 0) {
                setParseError("JSON must be an array of questions, or an object with a 'questions' array.");
                return;
            }

            if (questions.length > 500) {
                setParseError(`Too many questions (${questions.length}). Maximum is 500 per import.`);
                return;
            }

            setFileName(`Pasted (${questions.length} questions)`);
            setJsonData(questions);
            setStep(2);
        } catch (err) {
            setParseError(`Invalid JSON: ${err.message}`);
        }
    };

    const handleClose = () => {
        setStep(1);
        setJsonData(null);
        setFileName("");
        setParseError("");
        setResult(null);
        setCourseId("");
        setBatchId("");
        setInputMode("file");
        setPasteText("");
        onClose();
    };

    if (!isOpen) return null;

    const courseOptions = [{ label: "No Course (General)", value: "" }, ...courses.map(c => ({ label: c.name, value: c._id }))];
    const batchOptions = [{ label: "No Batch", value: "" }, ...filteredBatches.map(b => ({ label: b.name, value: b._id }))];

    // Count types in preview
    const typeCounts = jsonData ? jsonData.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {}) : {};

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <FileJson size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900">Bulk Import Questions</h2>
                            <p className="text-xs text-slate-400 font-medium">
                                {step === 1 && "Upload a JSON file"}
                                {step === 2 && "Review & import"}
                                {step === 3 && "Import complete"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Upload or Paste */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-5"
                            >
                                {/* Tab Switcher */}
                                <div className="flex bg-slate-100 rounded-xl p-1">
                                    <button
                                        onClick={() => setInputMode("file")}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                            inputMode === "file"
                                                ? "bg-white text-slate-800 shadow-sm"
                                                : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        <Upload size={14} />
                                        Upload File
                                    </button>
                                    <button
                                        onClick={() => setInputMode("paste")}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                            inputMode === "paste"
                                                ? "bg-white text-slate-800 shadow-sm"
                                                : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        <ClipboardPaste size={14} />
                                        Paste JSON
                                    </button>
                                </div>

                                {/* File Upload Zone */}
                                {inputMode === "file" && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-16 text-center cursor-pointer transition-all hover:bg-blue-50/50 group"
                                    >
                                        <Upload size={44} className="mx-auto text-slate-300 group-hover:text-blue-500 transition-colors mb-4" />
                                        <p className="text-sm font-bold text-slate-600">
                                            Click to upload a <span className="text-blue-600">.json</span> file
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">Maximum 500 questions per file</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                )}

                                {/* Paste JSON Zone */}
                                {inputMode === "paste" && (
                                    <div className="space-y-3">
                                        <textarea
                                            value={pasteText}
                                            onChange={(e) => setPasteText(e.target.value)}
                                            placeholder='Paste your JSON array here...\n[\n  { "text": "...", "type": "mcq", ... }\n]'
                                            className="w-full h-[280px] p-4 rounded-2xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none font-mono text-xs text-slate-700 bg-slate-50 placeholder:text-slate-300"
                                        />
                                        <Button
                                            onClick={handlePasteSubmit}
                                            disabled={!pasteText.trim()}
                                            className="w-full font-bold flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} />
                                            Parse & Preview
                                        </Button>
                                    </div>
                                )}

                                {parseError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-medium flex items-start gap-3">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        {parseError}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Preview */}
                        {step === 2 && jsonData && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* File Info */}
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                                    <CheckCircle size={20} className="text-green-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-green-800">
                                            {fileName} — {jsonData.length} question{jsonData.length !== 1 ? 's' : ''} found
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(typeCounts).map(([type, count]) => (
                                                <span key={type} className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-green-200 text-green-700">
                                                    {type.replace('_', ' ')}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Optional Course/Batch Assignment */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        label="Assign to Course (optional)"
                                        value={courseId}
                                        onChange={(val) => { setCourseId(val); setBatchId(""); }}
                                        options={courseOptions}
                                        placeholder="Select Course"
                                    />
                                    <Select
                                        label="Assign to Batch (optional)"
                                        value={batchId}
                                        onChange={(val) => setBatchId(val)}
                                        options={batchOptions}
                                        placeholder="Select Batch"
                                        disabled={!courseId}
                                    />
                                </div>

                                {/* Preview Table */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold w-8">#</th>
                                                <th className="px-4 py-3 text-left font-bold">Question</th>
                                                <th className="px-4 py-3 text-left font-bold">Type</th>
                                                <th className="px-4 py-3 text-left font-bold">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {jsonData.slice(0, 50).map((q, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-800 line-clamp-1 max-w-xs">
                                                        {q.text}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                                                            {q.type?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-600">{q.marks ?? 1}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {jsonData.length > 50 && (
                                        <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 text-center font-bold">
                                            ... and {jsonData.length - 50} more questions
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Result */}
                        {step === 3 && result && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                {/* Summary Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-50 rounded-2xl p-5 text-center">
                                        <p className="text-3xl font-black text-slate-900">{result.summary.total}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total</p>
                                    </div>
                                    <div className="bg-green-50 rounded-2xl p-5 text-center">
                                        <p className="text-3xl font-black text-green-600">{result.summary.imported}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mt-1">Imported</p>
                                    </div>
                                    <div className={`rounded-2xl p-5 text-center ${result.summary.failed > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                                        <p className={`text-3xl font-black ${result.summary.failed > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                            {result.summary.failed}
                                        </p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${result.summary.failed > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                            Failed
                                        </p>
                                    </div>
                                </div>

                                {/* Error Details */}
                                {result.errors && result.errors.length > 0 && (
                                    <div className="border border-red-200 rounded-2xl overflow-hidden">
                                        <div className="bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            Failed Questions
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto divide-y divide-red-100">
                                            {result.errors.map((err, i) => (
                                                <div key={i} className="px-4 py-3 text-sm">
                                                    <span className="font-bold text-red-700">Question {err.index + 1}: </span>
                                                    <span className="text-red-600">{err.errors.join('; ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
                    {step === 1 && (
                        <p className="text-xs text-slate-400 font-medium">
                            Supports MCQ, True/False, Short Answer & Essay types
                        </p>
                    )}
                    {step === 2 && (
                        <button
                            onClick={() => { setStep(1); setJsonData(null); setFileName(""); }}
                            className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            ← Change File
                        </button>
                    )}
                    {step === 3 && <div />}

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={handleClose}>
                            {step === 3 ? "Close" : "Cancel"}
                        </Button>
                        {step === 2 && (
                            <Button
                                onClick={handleImport}
                                disabled={importing}
                                className="font-bold flex items-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Import {jsonData?.length} Questions
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
