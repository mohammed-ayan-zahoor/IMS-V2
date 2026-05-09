"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { cn } from "@/lib/utils";

const SlidingNotices = ({ instituteId, isEditing = false }) => {
    const [notices, setNotices] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const res = await fetch(`/api/v1/website/notices?instituteId=${instituteId}`);
                const data = await res.json();
                if (res.ok) setNotices(data.notices);
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
        { id: 1, title: "Admissions Open for 2024-25", description: "Enroll your child today in our premium school environment." },
        { id: 2, title: "Upcoming Vocational Workshop", description: "Join our weekend workshop on digital literacy and skill development." }
    ];

    useEffect(() => {
        if (displayNotices.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % displayNotices.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [displayNotices]);

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
            console.error("Click tracking failed");
        }
    };

    return (
        <div className="bg-premium-blue text-white py-3 overflow-hidden">
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
