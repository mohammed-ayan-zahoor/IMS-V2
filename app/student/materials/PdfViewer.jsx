"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Link as LinkIcon, AlertTriangle, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ file, onClose }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [pageWidth, setPageWidth] = useState(800); // Initialize with default width
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const modalRef = useRef(null);
    const containerRef = useRef(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    }

    function onDocumentLoadError(error) {
        setError("Failed to load PDF. Please try again.");
        setLoading(false);
        console.error("PDF load error:", error);
    }

    function handleRetry() {
        setError(null);
        setLoading(true);
        setRetryCount(prev => prev + 1);
    }

    // Reset pagination when file changes
    useEffect(() => {
        setPageNumber(1);
        setLoading(true);
        setError(null);
        setRetryCount(0);
    }, [file]);

    // Lock/unlock body scroll when modal opens/closes
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    // Resize Observer for responsive PDF width
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    // Subtract minimal padding (16px) for better PDF view
                    setPageWidth(Math.max(400, entry.contentRect.width - 16));
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef]);

    // Keyboard navigation and accessibility
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();

            // Arrow key navigation
            if (e.key === 'ArrowLeft' && pageNumber > 1) {
                e.preventDefault();
                setPageNumber(p => Math.max(1, p - 1));
            }
            if (e.key === 'ArrowRight' && pageNumber < (numPages || 1)) {
                e.preventDefault();
                setPageNumber(p => Math.min(numPages || 1, p + 1));
            }

            // Focus Trap
            if (e.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            }
        };

        const previousActiveElement = document.activeElement;

        // Initial Focus
        if (modalRef.current) {
            modalRef.current.focus();
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (previousActiveElement && previousActiveElement.focus) previousActiveElement.focus();
        };
    }, [onClose, pageNumber, numPages]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 md:p-4 animate-in fade-in"
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] md:h-[90vh] flex flex-col relative overflow-hidden outline-none">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 md:p-4 border-b border-slate-100 bg-white z-10 gap-3">
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                            <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 line-clamp-1 text-sm md:text-base">{file.title}</h3>
                            <p className="text-xs text-slate-500 hidden md:block">
                                Page {pageNumber} of {numPages || '--'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-auto md:hidden p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            aria-label="Close PDF viewer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mobile Navigation Controls */}
                    <div className="flex items-center gap-2 md:hidden w-full justify-center">
                        <button
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            disabled={pageNumber <= 1}
                            className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Previous page (← arrow)"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-medium text-slate-500">
                            {pageNumber} / {numPages || '--'}
                        </span>
                        <button
                            onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                            disabled={pageNumber >= (numPages || 1)}
                            className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Next page (→ arrow)"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Controls Config */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg self-center mx-auto md:mx-0">
                            <button
                                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-xs font-bold w-10 text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                                className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={18} />
                            </button>
                        </div>

                        <div className="flex gap-2 hidden md:flex">
                            <a href={file.file?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                            >
                                <LinkIcon size={16} />
                                Open
                            </a>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                                aria-label="Close PDF viewer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-100 overflow-auto flex flex-col justify-center items-center p-2 md:p-4 relative" ref={containerRef}>
                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center gap-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <AlertTriangle size={36} />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-700">{error}</p>
                                <p className="text-sm text-slate-500 mt-2">Try refreshing or download the file directly.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRetry}
                                    className="flex items-center gap-2 px-4 py-2 bg-premium-blue text-white rounded-lg text-sm font-bold hover:bg-premium-blue/90 transition-colors"
                                >
                                    <RotateCcw size={16} />
                                    Retry
                                </button>
                                <a
                                    href={file.file?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors"
                                >
                                    Download
                                </a>
                            </div>
                        </div>
                    ) : (
                        <Document
                            file={file.file?.url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            key={`${file._id}-${retryCount}`}
                            loading={
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <LoadingSpinner />
                                    <p className="text-sm text-slate-500">Loading PDF...</p>
                                </div>
                            }
                            className="shadow-xl"
                        >
                            {!error && pageWidth && (
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    width={pageWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="bg-white shadow-lg"
                                />
                            )}
                        </Document>
                    )}
                </div>

                {/* Footer Controls - Desktop Only */}
                <div className="hidden md:flex p-3 md:p-4 border-t border-slate-100 bg-white justify-center items-center gap-4 z-10">
                    <button
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        title="Previous page (← arrow)"
                    >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                    </button>
                    <span className="text-xs md:text-sm font-medium text-slate-500 flex-shrink-0">
                        {pageNumber} / {numPages || '--'}
                    </span>
                    <button
                        onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                        disabled={pageNumber >= (numPages || 1)}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        title="Next page (→ arrow)"
                    >
                        <span>Next</span>
                        <ChevronRight size={16} />
                    </button>
                    <div className="text-xs text-slate-400 ml-4 hidden lg:block">
                        💡 Use ← → arrow keys to navigate
                    </div>
                </div>
            </div>
        </div>
    );
}
