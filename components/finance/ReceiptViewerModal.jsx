"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    X, ChevronLeft, ChevronRight, Download, ExternalLink, 
    ZoomIn, ZoomOut, RotateCcw, FileText, Receipt 
} from "lucide-react";

export default function ReceiptViewerModal({
    isOpen,
    onClose,
    attachments = [],
    initialIndex = 0,
    title = "Receipts & Documents"
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex || 0);
            setZoom(1);
        }
    }, [isOpen, initialIndex]);

    const currentAtt = attachments[currentIndex] || null;
    const isPdf = currentAtt?.mimeType === "application/pdf" || currentAtt?.filename?.endsWith(".pdf");

    const handlePrev = useCallback(() => {
        setZoom(1);
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : attachments.length - 1));
    }, [attachments.length]);

    const handleNext = useCallback(() => {
        setZoom(1);
        setCurrentIndex(prev => (prev < attachments.length - 1 ? prev + 1 : 0));
    }, [attachments.length]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") handlePrev();
            else if (e.key === "ArrowRight") handleNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, handlePrev, handleNext]);

    if (!isOpen || !attachments || attachments.length === 0) return null;

    const downloadUrl = currentAtt?.url ? `${currentAtt.url}?download=true` : "#";

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md text-white select-none animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                        <Receipt size={18} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate text-white">
                            {title}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                            {currentAtt?.originalName || `Document ${currentIndex + 1}`} · {currentIndex + 1} of {attachments.length}
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2">
                    {!isPdf && (
                        <>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-xs text-slate-400 font-mono w-12 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(1)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                title="Reset Zoom"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <div className="w-px h-5 bg-white/10 mx-1" />
                        </>
                    )}

                    <a
                        href={currentAtt?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Open in new tab"
                    >
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Open</span>
                    </a>

                    <a
                        href={downloadUrl}
                        download
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Download file"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download</span>
                    </a>

                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-2 p-2 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors"
                        title="Close (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                {/* Navigation Arrows */}
                {attachments.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="absolute left-4 z-10 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 flex items-center justify-center shadow-lg transition-transform active:scale-95"
                            title="Previous (Left arrow)"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="absolute right-4 z-10 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 flex items-center justify-center shadow-lg transition-transform active:scale-95"
                            title="Next (Right arrow)"
                        >
                            <ChevronRight size={22} />
                        </button>
                    </>
                )}

                {/* Content */}
                {isPdf ? (
                    <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center bg-slate-900/70 rounded-2xl border border-white/10 overflow-hidden p-6 text-center">
                        <FileText size={56} className="text-rose-400 mb-4" />
                        <h4 className="text-base font-bold text-white mb-2">
                            {currentAtt.originalName || "PDF Document"}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mb-6">
                            This receipt is stored as a PDF document. You can preview it in full or download it directly.
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href={currentAtt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                            >
                                <ExternalLink size={14} /> Open Full PDF
                            </a>
                            <a
                                href={downloadUrl}
                                download
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
                            >
                                <Download size={14} /> Download PDF
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                        <img
                            src={currentAtt?.url}
                            alt={currentAtt?.originalName || "Receipt"}
                            style={{
                                transform: `scale(${zoom})`,
                                transition: "transform 150ms ease-out",
                                transformOrigin: "center center"
                            }}
                            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {attachments.length > 1 && (
                <div className="px-6 py-3 border-t border-white/10 bg-slate-900/60 shrink-0 flex items-center justify-center gap-3 overflow-x-auto">
                    {attachments.map((att, idx) => {
                        const isThumbPdf = att.mimeType === "application/pdf" || att.filename?.endsWith(".pdf");
                        const isSelected = idx === currentIndex;
                        return (
                            <button
                                key={att.filename || idx}
                                type="button"
                                onClick={() => {
                                    setZoom(1);
                                    setCurrentIndex(idx);
                                }}
                                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-slate-800 flex items-center justify-center ${
                                    isSelected ? "border-blue-400 scale-105 shadow-md" : "border-white/10 opacity-60 hover:opacity-100"
                                }`}
                            >
                                {isThumbPdf ? (
                                    <span className="text-[10px] font-black text-rose-400 uppercase">PDF</span>
                                ) : (
                                    <img
                                        src={att.url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
