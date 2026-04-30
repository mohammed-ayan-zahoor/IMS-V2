"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { FileText, Video, Link as LinkIcon, Download, Search, BookOpen, Clock, AlertTriangle, X, UploadCloud, CheckCircle, HelpCircle } from "lucide-react";
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

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

    // Homework Submission State
    const [submittingMat, setSubmittingMat] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [submissions, setSubmissions] = useState({}); // { matId: submissionData }

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

    // Fetch existing submissions for assignments
    useEffect(() => {
        if (materials.length > 0) {
            const assignmentIds = materials
                .filter(m => m.category === 'assignment' && m.allowSubmissions)
                .map(m => m._id);
            
            if (assignmentIds.length > 0) {
                fetchSubmissions(assignmentIds);
            }
        }
    }, [materials]);

    const fetchSubmissions = async (ids) => {
        try {
            // We can either fetch one by one or have a bulk API. 
            // For now, let's fetch individual status when possible or bulk if implemented.
            // Since we don't have a bulk API yet, let's just fetch for each.
            const subsMap = {};
            await Promise.all(ids.map(async (id) => {
                const res = await fetch(`/api/v1/assignments/${id}/submit`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.submission) subsMap[id] = data.submission;
                }
            }));
            setSubmissions(subsMap);
        } catch (err) {
            console.error("Submissions fetch error", err);
        }
    };

    const handleFileUpload = async (e, matId) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileType", "document");

            const uploadRes = await fetch("/api/v1/upload", { method: "POST", body: formData });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            const submitRes = await fetch(`/api/v1/assignments/${matId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file: {
                        url: uploadData.url,
                        publicId: uploadData.public_id,
                        originalName: file.name,
                        size: file.size
                    }
                })
            });

            if (submitRes.ok) {
                const data = await submitRes.json();
                setSubmissions({ ...submissions, [matId]: data.submission });
                setSubmittingMat(null);
            } else {
                throw new Error("Submission failed");
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setIsUploading(false);
        }
    };

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
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <FileText size={18} />
                                    View PDF
                                </button>
                            ) : (
                                <a
                                    href={mat.file?.url}
                                    target="_self"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <Download size={18} />
                                    Access Resource
                                </a>
                            )}

                            {/* Assignment Submission Section */}
                            {mat.category === 'assignment' && mat.allowSubmissions && (
                                <div className="pt-4 mt-4 border-t border-slate-50">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submission Status</span>
                                            {submissions[mat._id] ? (
                                                <Badge variant={submissions[mat._id].status === 'graded' ? "success" : "warning"} className="text-[9px] uppercase font-bold py-0.5 px-2">
                                                    {submissions[mat._id].status === 'graded' ? "Graded" : "Pending Review"}
                                                </Badge>
                                            ) : (
                                                <Badge variant="neutral" className="text-[9px] uppercase font-bold py-0.5 px-2 bg-slate-100 text-slate-400">Not Submitted</Badge>
                                            )}
                                        </div>

                                        {submissions[mat._id] ? (
                                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">
                                                        {submissions[mat._id].file?.originalName || "work-submission.pdf"}
                                                    </p>
                                                    <button 
                                                        onClick={() => window.open(submissions[mat._id].file?.url, '_blank')}
                                                        className="text-[10px] font-black text-premium-blue hover:underline flex items-center gap-1"
                                                    >
                                                        View <ExternalLink size={10} />
                                                    </button>
                                                </div>
                                                
                                                {submissions[mat._id].status === 'graded' ? (
                                                    <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200/50">
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                                                            <CheckCircle size={14} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-black text-slate-900">Score: {submissions[mat._id].marksAwarded} / {mat.totalMarks || "-"}</p>
                                                            {submissions[mat._id].feedback && <p className="text-[9px] text-slate-500 italic line-clamp-1">"{submissions[mat._id].feedback}"</p>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setSubmittingMat(mat)}
                                                        className="text-[10px] font-bold text-slate-400 hover:text-premium-blue transition-colors w-full text-left"
                                                    >
                                                        Re-submit Work?
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSubmittingMat(mat)}
                                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
                                            >
                                                <UploadCloud size={18} />
                                                Submit Homework
                                            </button>
                                        )}
                                        
                                        {mat.dueDate && (
                                            <p className="text-[10px] text-center font-bold text-slate-400 italic">
                                                Deadline: {format(new Date(mat.dueDate), "MMM d, yyyy")}
                                            </p>
                                        )}
                                    </div>
                                </div>
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
            {/* PDF Viewer Modal */}
            {selectedPdf && (
                <PdfViewer
                    file={selectedPdf}
                    onClose={() => setSelectedPdf(null)}
                />
            )}

            {/* Submission Modal */}
            {submittingMat && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/20">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900">Submit Homework</h2>
                            <button onClick={() => setSubmittingMat(null)} className="text-slate-400 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-premium-blue/5 border border-premium-blue/10">
                                <h3 className="text-sm font-bold text-slate-900">{submittingMat.title}</h3>
                                <p className="text-xs text-slate-500 mt-1">Total Marks: {submittingMat.totalMarks || "N/A"}</p>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-premium-blue/30 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {isUploading ? (
                                            <LoadingSpinner />
                                        ) : (
                                            <>
                                                <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-premium-blue transition-colors mb-2" />
                                                <p className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Click to upload your work</p>
                                                <p className="text-[10px] text-slate-400 mt-1">PDF, Images or Documents (Max 10MB)</p>
                                            </>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => handleFileUpload(e, submittingMat._id)}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50/50 flex justify-end">
                            <button onClick={() => setSubmittingMat(null)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// PDF Modal Component


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
