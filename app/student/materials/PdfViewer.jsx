"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Link as LinkIcon, AlertTriangle, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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
    const modalRef = useRef(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    // Reset pagination when file changes
    useEffect(() => {
        setPageNumber(1);
        setLoading(true);
    }, [file]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();

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
            if (previousActiveElement) previousActiveElement.focus();
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in"
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden outline-none">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 line-clamp-1">{file.title}</h3>
                            <p className="text-xs text-slate-500">
                                Page {pageNumber} of {numPages || '--'}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                            className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={() => setScale(s => Math.min(2, s + 0.1))}
                            className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <a
                            href={file.file?.url}
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

                {/* Content */}
                <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-8 relative">
                    <Document
                        file={file.file?.url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div className="absolute inset-0 flex items-center justify-center">
                                <LoadingSpinner />
                            </div>
                        }
                        error={
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
                                <AlertTriangle size={36} className="mb-4 text-slate-400" />
                                <p className="font-medium">Failed to load PDF.</p>
                                <a href={file.file?.url} target="_blank" className="text-premium-blue hover:underline text-sm mt-2">Download file</a>
                            </div>
                        }
                        className="shadow-xl"
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="bg-white"
                        />
                    </Document>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-center items-center gap-4 z-10">
                    <button
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                        {pageNumber} / {numPages || '--'}
                    </span>
                    <button
                        onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                        disabled={pageNumber >= (numPages || 1)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
