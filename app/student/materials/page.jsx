"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { FileText, Video, Link as LinkIcon, Download, Search, BookOpen, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeType, setActiveType] = useState("all"); // all, pdf, video
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        const fetchMaterials = async () => {
            try {
                const res = await fetch("/api/v1/student/materials");
                const data = await res.json();
                setMaterials(data.materials || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchMaterials();
    }, []);

    const filteredMaterials = materials.filter(mat => {
        const matchesSearch = mat.title.toLowerCase().includes(search.toLowerCase()) || mat.course?.name?.toLowerCase().includes(search.toLowerCase());
        const matchesType = activeType === 'all' || mat.file?.type === activeType;
        return matchesSearch && matchesType;
    });

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Learning Materials</h1>
                <p className="text-slate-500">Access notes, assignments, and reference videos for your courses.</p>
            </div>

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
                                {mat.file?.type.toUpperCase()}
                            </Badge>
                        </div>

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
                                    onClick={() => setSelectedVideo(mat)}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-premium-blue text-white rounded-xl font-bold hover:bg-premium-blue/90 transition-colors shadow-lg shadow-premium-blue/20"
                                >
                                    <PlayCircle size={18} />
                                    Watch Video
                                </button>
                            ) : (
                                <a
                                    href={mat.file?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
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
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative">
                        <div className="flex justify-between items-center p-4 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
                            <h3 className="text-white font-bold truncate pr-8">{selectedVideo.title}</h3>
                            <button onClick={() => setSelectedVideo(null)} className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 backdrop-blur-md">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="aspect-video bg-black flex items-center justify-center">
                            {(selectedVideo.file?.url.includes('youtube.com') || selectedVideo.file?.url.includes('youtu.be')) ? (
                                <iframe
                                    src={getEmbedUrl(selectedVideo.file.url)}
                                    title={selectedVideo.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <video controls autoPlay className="w-full h-full max-h-[80vh]">
                                    <source src={selectedVideo.file?.url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to extract video ID and format as embed URL
function getEmbedUrl(url) {
    if (!url) return "";

    let videoId = "";

    if (url.includes("youtu.be")) {
        // Handle short URL: https://youtu.be/VIDEO_ID
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("watch?v=")) {
        // Handle standard URL: https://www.youtube.com/watch?v=VIDEO_ID
        videoId = url.split("watch?v=")[1]?.split("&")[0];
    } else if (url.includes("embed/")) {
        // Already an embed URL
        return url;
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    return url; // Fallback
}

import { X, PlayCircle } from "lucide-react"; // Import X and PlayCircle for modal
