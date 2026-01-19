"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { FileText, Video, Link as LinkIcon, Download, Search, BookOpen, Clock, AlertTriangle, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeType, setActiveType] = useState("all"); // all, pdf, video
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [videoError, setVideoError] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const fetchMaterials = async () => {
            try {
                const res = await fetch("/api/v1/student/materials", { signal: controller.signal });
                if (!res.ok) throw new Error("Failed to load materials");
                const data = await res.json();
                if (!controller.signal.aborted) {
                    setMaterials(data.materials || []);
                    setError(null);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Fetch materials error:", error);
                    setError("Unable to load materials. Please try again later.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        fetchMaterials();
        return () => controller.abort();
    }, []);

    const filteredMaterials = materials.filter(mat => {
        const matchesSearch = mat.title.toLowerCase().includes(search.toLowerCase()) || mat.course?.name?.toLowerCase().includes(search.toLowerCase());
        const matchesType = activeType === 'all' || mat.file?.type === activeType;
        return matchesSearch && matchesType;
    });

    if (loading) return <LoadingSpinner fullPage />;

    // IframeWithFallback handles its own loading state locally now.
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Learning Materials</h1>
                <p className="text-slate-500">Access notes, assignments, and reference videos for your courses.</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div role="alert" className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-4 animate-in slide-in-from-top-2">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800">Unable to load materials</h3>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex bg-slate-100/50 p-1 rounded-xl w-fit">
                    {['all', 'pdf', 'video'].map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeType === type
                                ? "bg-white text-premium-blue shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            {type === 'all' ? 'All Resources' : type + 's'}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or course..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-premium-blue/20 outline-none text-slate-700 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map(mat => (
                    <Card key={mat._id} className="group hover:border-premium-blue/30 transition-all flex flex-col h-full hover:shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${mat.file?.type === 'pdf' ? 'bg-red-50 text-red-600' :
                                mat.file?.type === 'video' ? 'bg-purple-50 text-purple-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                {mat.file?.type === 'pdf' ? <FileText size={22} /> :
                                    mat.file?.type === 'video' ? <Video size={22} /> :
                                        <LinkIcon size={22} />}
                            </div>
                            <Badge variant="neutral" className="bg-slate-100 text-slate-500">
                                {mat.file?.type?.toUpperCase() ?? 'UNKNOWN'}
                            </Badge>                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-premium-blue transition-colors">
                            {mat.title}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                            {mat.description || "No description provided."}
                        </p>

                        <div className="mt-auto space-y-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                    <BookOpen size={14} />
                                    {mat.course?.name}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {format(new Date(mat.createdAt), "MMM d")}
                                </span>
                            </div>

                            {mat.file?.type === 'video' ? (
                                <button
                                    onClick={() => setSelectedVideo(mat)} // Triggers loading state logic via useEffect below (not implemented here but in component body)
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:bg-premium-blue/90 transition-colors shadow-lg shadow-premium-blue/20"
                                >
                                    <Video size={18} />
                                    Watch Video
                                </button>
                            ) : mat.file?.type === 'pdf' ? (
                                <button
                                    onClick={() => setSelectedPdf(mat)}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 group-hover:shadow-premium-blue/20 group-hover:bg-premium-blue"
                                >
                                    <FileText size={18} />
                                    View PDF
                                </button>
                            ) : (
                                <a
                                    href={mat.file?.url}
                                    target="_self"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 group-hover:shadow-premium-blue/20 group-hover:bg-premium-blue"
                                >
                                    <Download size={18} />
                                    Access Resource
                                </a>
                            )}
                        </div>
                    </Card>
                ))}

                {!loading && filteredMaterials.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No materials found</h3>
                        <p className="text-slate-500">Check back later for new resources.</p>
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}

            {/* PDF Viewer Modal */}
            {selectedPdf && (
                <PdfModal
                    file={selectedPdf}
                    onClose={() => setSelectedPdf(null)}
                />
            )}
        </div>
    );
}

// PDF Modal Component
function PdfModal({ file, onClose }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    // Reset pagination when file changes
    useEffect(() => {
        setPageNumber(1);
        setLoading(true);
    }, [file]);

    const modalRef = useRef(null);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            }
        };

        const previousActiveElement = document.activeElement;
        if (modalRef.current) modalRef.current.focus();

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
                        </button>                    </div>
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

// Video Modal Component with Accessibility
function VideoModal({ video, onClose }) {
    const [videoError, setVideoError] = useState(false);
    const modalRef = useRef(null);

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative outline-none">
                <div className="flex justify-between items-center p-4 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
                    <h3 className="text-white font-bold truncate pr-8">{video.title}</h3>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 backdrop-blur-md focus:ring-2 focus:ring-white/50 outline-none"
                        aria-label="Close video"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="aspect-video bg-black flex items-center justify-center relative">
                    {videoError ? (
                        <div className="text-center p-6 space-y-4">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Video Unavailable</h3>
                                <p className="text-slate-400 text-sm">The video could not be loaded.</p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setVideoError(false)}
                                    className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20"
                                >
                                    Retry
                                </button>
                                <a
                                    href={video.file?.url}
                                    target="_self"
                                    className="px-4 py-2 bg-premium-blue text-white rounded-lg text-xs font-bold hover:bg-premium-blue/90"
                                >
                                    Open Directly
                                </a>
                            </div>
                        </div>
                    ) : (video.file?.url && (video.file.url.includes('youtube.com') || video.file.url.includes('youtu.be'))) ? (
                        <IframeWithFallback
                            src={getEmbedUrl(video.file.url)}
                            title={video.title}
                            onError={() => setVideoError(true)}
                            iframeTimeoutMs={15000}
                        />
                    ) : (
                        <video
                            controls
                            autoPlay
                            className="w-full h-full max-h-[80vh]"
                            onError={() => setVideoError(true)}
                        >
                            <source src={video.file?.url} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                </div>
            </div>
        </div>
    );
}

// Iframe component with Timeout strategy
function IframeWithFallback({ src, title, onError, iframeTimeoutMs = 15000 }) {
    const [loaded, setLoaded] = useState(false);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!loaded) {
                onErrorRef.current();
            }
        }, iframeTimeoutMs);
        return () => clearTimeout(timer);
    }, [loaded, iframeTimeoutMs]);

    return (
        <div className="relative w-full h-full bg-black">
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <LoadingSpinner />
                </div>
            )}
            <iframe
                src={src}
                title={title}
                className={`w-full h-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} relative z-10`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
}

// Helper to extract video ID and format as embed URL
function getEmbedUrl(sourceUrl) {
    if (!sourceUrl) return "";

    try {
        const url = new URL(sourceUrl);
        const hostname = url.hostname;
        let videoId = "";

        if (hostname.includes("youtu.be")) {
            // https://youtu.be/ID/extra -> becomes [ID, extra]
            const segments = url.pathname.split('/').filter(Boolean);
            videoId = segments[0];
        } else if (hostname.includes("youtube.com")) {
            // https://youtube.com/watch?v=ID or /embed/ID
            if (url.pathname.includes("/embed/")) {
                return sourceUrl;
            }
            videoId = url.searchParams.get("v");
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        return sourceUrl;

    } catch (e) {
        return ""; // Fallback for invalid URLs
    }
}
