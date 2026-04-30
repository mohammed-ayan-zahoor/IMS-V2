"use client";

import { useState, useEffect } from "react";
import { 
    Bell, 
    Megaphone, 
    Pin, 
    Calendar, 
    AlertTriangle, 
    Info, 
    PartyPopper,
    ChevronRight,
    Search,
    Filter,
    Clock,
    Paperclip,
    ExternalLink,
    X,
    Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function StudentNoticeBoardPage() {
    const toast = useToast();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selectedNotice, setSelectedNotice] = useState(null);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await fetch("/api/v1/student/notices");
            const data = await res.json();
            if (res.ok) {
                setNotices(data.notices || []);
            } else {
                toast.error(data.error || "Failed to load notices");
            }
        } catch (error) {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filteredNotices = notices.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                             n.content.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || n.type === filter;
        return matchesSearch && matchesFilter;
    });

    const pinnedNotices = filteredNotices.filter(n => n.isPinned);
    const recentNotices = filteredNotices.filter(n => !n.isPinned);

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {/* Header Area - Soft Premium Theme */}
            <div className="relative p-12 rounded-[3.5rem] bg-white border border-slate-100 text-slate-900 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-premium-blue/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-premium-blue/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <Badge variant="neutral" className="bg-blue-50 text-premium-blue border-blue-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Sparkles size={12} className="mr-2" /> Unified Bulletin Board
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tight leading-none">
                            Institutional <br/> <span className="text-premium-blue">Announcements</span>
                        </h1>
                        <p className="text-slate-500 font-medium max-w-md">Stay updated with the latest news, events, and urgent alerts from your institute.</p>
                    </div>
                    
                    <div className="w-full md:w-auto flex flex-col gap-4">
                         <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={18} />
                            <input 
                                type="text"
                                placeholder="Search notices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full md:w-80 pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-premium-blue/10 focus:border-premium-blue/50 transition-all font-medium text-slate-900"
                            />
                         </div>
                         <div className="flex gap-2">
                             {['all', 'urgent', 'event', 'info'].map(t => (
                                 <button 
                                    key={t}
                                    onClick={() => setFilter(t)}
                                    className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        filter === t ? 'bg-premium-blue text-white border-premium-blue shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                    }`}
                                 >
                                     {t}
                                 </button>
                             ))}
                         </div>
                    </div>
                </div>
            </div>

            {/* Pinned Section */}
            {pinnedNotices.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-4 px-4">
                        <Pin size={20} className="text-rose-500 rotate-45" />
                        <h2 className="text-xl font-black italic text-slate-900 tracking-tight uppercase">Important Announcements</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {pinnedNotices.map(notice => (
                            <NoticeCard key={notice._id} notice={notice} onClick={() => setSelectedNotice(notice)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                    <Clock size={20} className="text-blue-500" />
                    <h2 className="text-xl font-black italic text-slate-900 tracking-tight uppercase">Recent Updates</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {recentNotices.map(notice => (
                        <NoticeCard key={notice._id} notice={notice} onClick={() => setSelectedNotice(notice)} />
                    ))}
                    {recentNotices.length === 0 && pinnedNotices.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3.5rem] border border-dashed border-slate-200">
                             <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-200">
                                <Megaphone size={40} />
                             </div>
                             <p className="text-slate-400 font-bold italic">Silence is golden. No active notices for now.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Notice Detail Modal */}
            <AnimatePresence>
                {selectedNotice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNotice(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className={`p-10 ${getTypeStyles(selectedNotice.type).bg} relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <button 
                                    onClick={() => setSelectedNotice(null)}
                                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                
                                <div className="space-y-4">
                                    <Badge variant="neutral" className={`${getTypeStyles(selectedNotice.type).badge} border-none px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest`}>
                                        {selectedNotice.type}
                                    </Badge>
                                    <h2 className="text-3xl font-black italic tracking-tight leading-tight">{selectedNotice.title}</h2>
                                    <p className="text-xs font-bold opacity-60 flex items-center gap-2">
                                        <Calendar size={14} /> Posted on {format(new Date(selectedNotice.createdAt), "MMMM d, yyyy")}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-10 overflow-y-auto flex-1 space-y-8">
                                <div className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                                    {selectedNotice.content}
                                </div>
                                
                                {selectedNotice.attachments?.length > 0 && (
                                    <div className="space-y-4 pt-8 border-t border-slate-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attached Documents</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedNotice.attachments.map((file, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                                                        <Paperclip size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Download</p>
                                                    </div>
                                                    <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-400" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <Button onClick={() => setSelectedNotice(null)} className="rounded-2xl px-10 font-black uppercase tracking-widest text-[10px]">
                                    I Understood
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function NoticeCard({ notice, onClick }) {
    const styles = getTypeStyles(notice.type);
    const Icon = styles.icon;

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -8 }}
            className="group cursor-pointer"
            onClick={onClick}
        >
            <Card className="h-full rounded-[3rem] border-none shadow-xl overflow-hidden flex flex-col group-hover:shadow-2xl transition-all duration-500">
                <div className={`h-2 ${styles.border}`} />
                <div className="p-8 flex flex-col flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 rounded-2xl ${styles.bg} flex items-center justify-center ${styles.text} shadow-sm group-hover:scale-110 transition-transform`}>
                            <Icon size={24} />
                        </div>
                        {notice.isPinned && (
                            <Pin size={18} className="text-rose-500 rotate-45" />
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="neutral" className={`${styles.badge} border-none px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest`}>
                                {notice.type}
                            </Badge>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{format(new Date(notice.createdAt), "MMM d")}</span>
                        </div>
                        <h3 className="text-xl font-black italic text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">{notice.title}</h3>
                        <p className="text-sm font-medium text-slate-500 line-clamp-3 leading-relaxed">{notice.content}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 group-hover:border-blue-50 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">View Details</span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

function getTypeStyles(type) {
    switch (type) {
        case 'urgent':
            return { 
                bg: 'bg-rose-50', 
                text: 'text-rose-600', 
                border: 'bg-rose-500', 
                badge: 'bg-rose-600 text-white',
                icon: AlertTriangle 
            };
        case 'event':
            return { 
                bg: 'bg-purple-50', 
                text: 'text-purple-600', 
                border: 'bg-purple-500', 
                badge: 'bg-purple-600 text-white',
                icon: PartyPopper 
            };
        case 'success':
            return { 
                bg: 'bg-emerald-50', 
                text: 'text-emerald-600', 
                border: 'bg-emerald-500', 
                badge: 'bg-emerald-600 text-white',
                icon: Info 
            };
        default:
            return { 
                bg: 'bg-blue-50', 
                text: 'text-blue-600', 
                border: 'bg-blue-500', 
                badge: 'bg-blue-600 text-white',
                icon: Info 
            };
    }
}
