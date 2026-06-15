"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";

const SlidingNotices = ({ instituteId, isEditing = false, content = {}, onUpdate }) => {
    const [notices, setNotices] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const {
        title = "Latest Announcements",
        layout = "ticker"
    } = content;

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const res = await fetch(`/api/v1/website/notices?instituteId=${instituteId}`);
                const data = await res.json();
                if (res.ok) setNotices(data.notices || []);
            } catch (error) {
                console.error("Failed to fetch public notices");
            } finally {
                setLoading(false);
            }
        };

        if (instituteId) fetchNotices();
    }, [instituteId]);

    // Mock data if empty
    const displayNotices = notices.length > 0 ? notices : [
        { _id: '1', title: "Admissions Open for 2024-25", description: "Enroll your child today in our premium school environment." },
        { _id: '2', title: "Upcoming Vocational Workshop", description: "Join our weekend workshop on digital literacy and skill development." }
    ];

    useEffect(() => {
        if (layout !== 'ticker' || displayNotices.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % displayNotices.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [displayNotices, layout]);

    if (loading && !isEditing) return null;

    const currentNotice = displayNotices[currentIndex];

    const handleNoticeClick = async (notice) => {
        if (!notice.link) return;
        
        try {
            fetch('/api/v1/website/notices/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noticeId: notice._id })
            });
            window.open(notice.link, '_blank');
        } catch (error) {
            console.error("Notice click tracking failed");
        }
    };

    if (layout === 'list') {
        return (
            <section className="py-20 bg-slate-50/50">
                <div className="container px-6 mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-slate-900">
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                    value={title}
                                    onChange={(e) => onUpdate({ title: e.target.value })}
                                />
                            ) : title}
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {displayNotices.map((notice) => (
                            <motion.div 
                                key={notice._id}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleNoticeClick(notice)}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="inline-flex px-2.5 py-1 bg-red-50 text-red-650 rounded-lg text-[9px] font-black uppercase tracking-wider">Notice</span>
                                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                        <Calendar size={12} />
                                        Recent
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{notice.title}</h3>
                                <p className="text-slate-500 text-sm mt-1">{notice.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <div className="bg-premium-blue text-white py-3 overflow-hidden" style={{ backgroundColor: 'var(--color-primary)' }}>
            <div className="container px-6 mx-auto flex items-center gap-4">
                <div className="shrink-0 flex items-center gap-2 font-bold text-xs uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30">
                    <Bell size={12} className="animate-bounce" />
                    Notice
                </div>

                <div className="flex-1 relative h-6 overflow-hidden cursor-pointer" onClick={() => handleNoticeClick(currentNotice)}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center sm:justify-start"
                        >
                            <span className="text-sm font-medium truncate max-w-[80vw]">
                                <span className="font-bold mr-2">{currentNotice.title}:</span>
                                {currentNotice.description}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentIndex(prev => (prev - 1 + displayNotices.length) % displayNotices.length)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex gap-1">
                        {displayNotices.map((_, i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                    i === currentIndex ? "bg-white w-3" : "bg-white/40"
                                )}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={() => setCurrentIndex(prev => (prev + 1) % displayNotices.length)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlidingNotices;
