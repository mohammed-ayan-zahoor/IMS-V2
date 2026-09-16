"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { 
    FileText, 
    Video, 
    Link as LinkIcon, 
    Download, 
    Search, 
    BookOpen, 
    Clock, 
    AlertTriangle, 
    X, 
    UploadCloud, 
    CheckCircle, 
    HelpCircle,
    Play,
    ExternalLink
} from "lucide-react";
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn, getYoutubeVideoId, getYoutubeThumbnail } from "@/lib/utils";

export default function StudentMaterialsPage() {
    return (
        <Suspense fallback={<LoadingSpinner fullPage />}>
            <MaterialsContent />
        </Suspense>
    );
}

function MaterialsContent() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeType, setActiveType] = useState("all"); // all, pdf, video
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [videoError, setVideoError] = useState(false);
    const [error, setError] = useState(null);
    const searchParams = useSearchParams();
    const targetId = searchParams.get("id");
    const [highlightedId, setHighlightedId] = useState(null);
    const scrollRefs = useRef({});

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

                    // If targetId is present, set it for highlighting
                    if (targetId) {
                        setHighlightedId(targetId);
                        // Clear highlight after 3 seconds
                        setTimeout(() => setHighlightedId(null), 3000);
                    }
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
    }, [targetId]);

    // Handle scrolling to targeted ID
    useEffect(() => {
        if (!loading && targetId && scrollRefs.current[targetId]) {
            setTimeout(() => {
                scrollRefs.current[targetId].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [loading, targetId, materials]);

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
        const q = search.toLowerCase().trim();
        const matchesSearch = !q || 
            (mat.title || "").toLowerCase().includes(q) || 
            (mat.course?.name || "").toLowerCase().includes(q) ||
            (mat.description || "").toLowerCase().includes(q);

        const ytId = getYoutubeVideoId(mat.file?.url);
        const isVideo = mat.file?.type === 'video' || Boolean(ytId);
        const isPdf = mat.file?.type === 'pdf';

        if (activeType === 'video') return matchesSearch && isVideo;
        if (activeType === 'pdf') return matchesSearch && isPdf;
        return matchesSearch;
    });

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-7xl mx-auto space-y-6 safe-pb p-2 sm:p-4">
            {/* Header Strip */}
            <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E]">Learning Materials</h1>
                    <p className="text-xs text-[#8D8A9B] mt-0.5">
                        Access video lectures, lecture notes, and reference materials for your enrolled courses.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold">
                        {filteredMaterials.length} {filteredMaterials.length === 1 ? "Resource" : "Resources"}
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div role="alert" className="bg-red-50 border border-red-200 p-4 rounded-[16px] flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800 text-sm">Unable to load materials</h3>
                        <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-[16px] border border-[#E9E8F0]">
                {/* Type Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                    {[
                        { id: 'all', label: 'All Resources' },
                        { id: 'video', label: 'Video Lectures' },
                        { id: 'pdf', label: 'PDF Handbooks' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveType(tab.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                activeType === tab.id
                                    ? "bg-[#2C2A46] text-white"
                                    : "bg-[#F8F7FA] text-[#8D8A9B] hover:text-[#1E1B2E]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D8A9B]" size={14} />
                    <input
                        type="text"
                        placeholder="Search resources, topics, or courses..."
                        className="w-full pl-9 pr-4 py-2 bg-[#F8F7FA] border border-[#E9E8F0] rounded-full text-xs font-medium text-[#1E1B2E] placeholder-[#8D8A9B] outline-none focus:border-[#6E5AE0] transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredMaterials.map(mat => {
                    const ytVideoId = getYoutubeVideoId(mat.file?.url);
                    const ytThumbnail = ytVideoId ? getYoutubeThumbnail(mat.file?.url) : null;
                    const isVideo = mat.file?.type === 'video' || Boolean(ytVideoId);
                    const isPdf = mat.file?.type === 'pdf';

                    return (
                        <div 
                            key={mat._id} 
                            ref={el => scrollRefs.current[mat._id] = el}
                            className={cn(
                                "transition-all duration-300 rounded-[16px]",
                                highlightedId === mat._id ? "ring-2 ring-[#6E5AE0] scale-[1.01]" : ""
                            )}
                        >
                            <div className="group bg-white rounded-[16px] border border-[#E9E8F0] p-5 hover:border-[#6E5AE0]/40 transition-all flex flex-col justify-between h-full">
                                <div>
                                    {/* YouTube Thumbnail Preview */}
                                    {ytThumbnail ? (
                                        <div 
                                            onClick={() => setSelectedVideo(mat)}
                                            className="relative w-full aspect-video rounded-[12px] overflow-hidden mb-3.5 bg-slate-950 cursor-pointer group/thumb border border-[#E9E8F0]"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={ytThumbnail}
                                                alt={mat.title}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/35 transition-colors flex items-center justify-center">
                                                <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md transform group-hover/thumb:scale-110 transition-transform">
                                                    <Play size={18} className="fill-white ml-0.5" />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white tracking-wide flex items-center gap-1">
                                                <Video size={11} />
                                                YouTube
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Meta Row: Type Badge and Category */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        {ytThumbnail ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold uppercase tracking-wider">
                                                <Play size={10} className="fill-red-700" />
                                                YouTube Video
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center border ${
                                                    isPdf 
                                                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                                        : isVideo 
                                                            ? 'bg-[#EDE8FB] text-[#6E5AE0] border-[#6E5AE0]/20' 
                                                            : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    {isPdf ? <FileText size={18} /> : isVideo ? <Video size={18} /> : <LinkIcon size={18} />}
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                    isPdf 
                                                        ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                                        : isVideo 
                                                            ? 'bg-[#EDE8FB] text-[#6E5AE0] border-[#6E5AE0]/20' 
                                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                    {isPdf ? 'PDF' : isVideo ? 'VIDEO' : (mat.file?.type?.toUpperCase() || 'FILE')}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase">
                                            {mat.category || "Lecture"}
                                        </span>
                                    </div>

                                    {/* Title and Description */}
                                    <h3 className="text-sm sm:text-base font-bold text-[#1E1B2E] mb-1 line-clamp-1 group-hover:text-[#6E5AE0] transition-colors" title={mat.title}>
                                        {mat.title}
                                    </h3>
                                    <p className="text-xs text-[#8D8A9B] mb-4 line-clamp-2 leading-relaxed">
                                        {mat.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="mt-auto space-y-3 pt-2">
                                    <div className="flex items-center gap-3 text-xs font-semibold text-[#8D8A9B]">
                                        <span className="flex items-center gap-1.5 truncate">
                                            <BookOpen size={13} className="shrink-0 text-[#8D8A9B]" />
                                            {mat.course?.name || "Enrolled Course"}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <Clock size={13} className="shrink-0 text-[#8D8A9B]" />
                                            {mat.createdAt ? format(new Date(mat.createdAt), "MMM d") : "Recent"}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    {isVideo ? (
                                        <button
                                            onClick={() => setSelectedVideo(mat)}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#6E5AE0] text-white rounded-full text-xs font-bold hover:bg-[#5844C7] transition-colors shadow-sm"
                                        >
                                            <Play size={14} className="fill-white" />
                                            Watch Video
                                        </button>
                                    ) : isPdf ? (
                                        <button
                                            onClick={() => setSelectedPdf(mat)}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2C2A46] text-white rounded-full text-xs font-bold hover:bg-[#1E1B2E] transition-colors shadow-sm"
                                        >
                                            <FileText size={14} />
                                            View PDF
                                        </button>
                                    ) : (
                                        <a
                                            href={mat.file?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2C2A46] text-white rounded-full text-xs font-bold hover:bg-[#1E1B2E] transition-colors shadow-sm"
                                        >
                                            <Download size={14} />
                                            Access Resource
                                        </a>
                                    )}

                                    {/* Assignment Submission Section */}
                                    {mat.category === 'assignment' && mat.allowSubmissions && (
                                        <div className="pt-3 mt-2 border-t border-[#E9E8F0]">
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Submission Status</span>
                                                    {submissions[mat._id] ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                                                            {submissions[mat._id].status === 'graded' ? "Graded" : "Pending Review"}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#8D8A9B] text-[10px] font-semibold">
                                                            Not Submitted
                                                        </span>
                                                    )}
                                                </div>

                                                {submissions[mat._id] ? (
                                                    <div className="bg-[#F8F7FA] rounded-[12px] p-3 border border-[#E9E8F0]">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <p className="text-[10px] font-semibold text-[#1E1B2E] truncate max-w-[140px]">
                                                                {submissions[mat._id].file?.originalName || "work-submission.pdf"}
                                                            </p>
                                                            <button 
                                                                onClick={() => window.open(submissions[mat._id].file?.url, '_blank')}
                                                                className="text-[10px] font-bold text-[#6E5AE0] hover:underline flex items-center gap-1"
                                                            >
                                                                View <ExternalLink size={10} />
                                                            </button>
                                                        </div>
                                                        
                                                        {submissions[mat._id].status === 'graded' ? (
                                                            <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-[#E9E8F0]">
                                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                                    <CheckCircle size={12} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-bold text-[#1E1B2E]">Score: {submissions[mat._id].marksAwarded} / {mat.totalMarks || "-"}</p>
                                                                    {submissions[mat._id].feedback && <p className="text-[9px] text-[#8D8A9B] italic line-clamp-1">&ldquo;{submissions[mat._id].feedback}&rdquo;</p>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setSubmittingMat(mat)}
                                                                className="text-[10px] font-bold text-[#8D8A9B] hover:text-[#6E5AE0] transition-colors w-full text-left"
                                                            >
                                                                Re-submit Work?
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setSubmittingMat(mat)}
                                                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100"
                                                    >
                                                        <UploadCloud size={14} />
                                                        Submit Homework
                                                    </button>
                                                )}
                                                
                                                {mat.dueDate && (
                                                    <p className="text-[10px] text-center font-medium text-[#8D8A9B]">
                                                        Deadline: {format(new Date(mat.dueDate), "MMM d, yyyy")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

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
    const videoId = getYoutubeVideoId(sourceUrl);
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return sourceUrl;
}

