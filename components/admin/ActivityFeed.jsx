"use client";

import { useState, useEffect } from "react";
import { 
    UserPlus, 
    MessageSquare, 
    CreditCard, 
    Clock, 
    ChevronRight,
    Search,
    BookOpen,
    Layers,
    FileText,
    Settings,
    UserCog,
    Calendar,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const ACTIVITY_CONFIG = {
    student: { icon: UserPlus, color: "bg-blue-50 text-blue-600" },
    enquiry: { icon: MessageSquare, color: "bg-orange-50 text-orange-600" },
    payment: { icon: CreditCard, color: "bg-emerald-50 text-emerald-600" },
    course: { icon: BookOpen, color: "bg-indigo-50 text-indigo-600" },
    batch: { icon: Layers, color: "bg-purple-50 text-purple-600" },
    subject: { icon: Layers, color: "bg-cyan-50 text-cyan-600" },
    attendance: { icon: Calendar, color: "bg-rose-50 text-rose-600" },
    material: { icon: FileText, color: "bg-amber-50 text-amber-600" },
    user: { icon: UserCog, color: "bg-slate-50 text-slate-600" },
    default: { icon: Clock, color: "bg-slate-50 text-slate-600" }
};

export default function ActivityFeed({ onQuickAdd }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleShortcut = (label) => {
        switch (label) {
            case 'Add Student':
                onQuickAdd?.();
                break;
            case 'Msg All':
                router.push('/admin/chat');
                break;
            case 'Fee Report':
                router.push('/admin/fees');
                break;
            case 'Search':
                document.getElementById('global-student-search')?.focus();
                break;
        }
    };

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/v1/dashboard/activity');
                if (res.ok) {
                    const data = await res.json();
                    if (data.activityFeed) {
                        const mapped = data.activityFeed.map(entry => {
                            let title = "System Update";
                            let description = "An action was performed";
                            let type = "default";

                            const actorName = entry.actor?.profile?.firstName || 'Staff';
                            const details = entry.details || {};

                            switch (entry.action) {
                                case 'student.create':
                                    title = "New Admission";
                                    description = `${actorName} enrolled ${details.name || details.studentName || 'a student'}`;
                                    type = "student";
                                    break;
                                case 'student.update':
                                    title = "Profile Updated";
                                    description = `${actorName} modified ${details.name || 'a student'}'s record`;
                                    type = "student";
                                    break;
                                case 'batch.enroll':
                                    title = "Batch Enrollment";
                                    description = `${details.studentName || 'Student'} assigned to ${details.batchName || 'a batch'}`;
                                    type = "batch";
                                    break;
                                case 'enquiry.create':
                                    title = "New Enquiry";
                                    description = `Interest received for ${details.courseName || 'a course'}`;
                                    type = "enquiry";
                                    break;
                                case 'fee.payment':
                                    title = "Fee Received";
                                    description = `Payment of ₹${details.amount?.toLocaleString() || '0'} recorded`;
                                    type = "payment";
                                    break;
                                case 'course.create':
                                case 'course.update':
                                    title = entry.action.includes('create') ? "Course Added" : "Course Updated";
                                    description = `${actorName} managed ${details.name || 'course'} details`;
                                    type = "course";
                                    break;
                                case 'subject.create':
                                case 'subject.update':
                                case 'subject.syllabus_update':
                                    title = "Curriculum Update";
                                    description = `New changes in ${details.subjectName || 'subject'} syllabus`;
                                    type = "subject";
                                    break;
                                case 'material.upload':
                                    title = "New Resource";
                                    description = `Learning material added to ${details.courseName || 'portal'}`;
                                    type = "material";
                                    break;
                                case 'attendance.mark':
                                    title = "Attendance Marked";
                                    description = `Daily logs updated for ${details.batchName || 'batch'}`;
                                    type = "attendance";
                                    break;
                                default:
                                    // Handle generic category mapping based on action strings
                                    if (entry.action.includes('student')) type = "student";
                                    else if (entry.action.includes('course')) type = "course";
                                    else if (entry.action.includes('fee')) type = "payment";
                                    else if (entry.action.includes('user')) type = "user";
                                    
                                    title = entry.action.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                                    description = `${actorName} performed a ${entry.action.split('.')[1] || 'update'}`;
                            }

                            return {
                                id: entry._id,
                                type,
                                title,
                                description,
                                time: new Date(entry.createdAt)
                            };
                        });
                        setActivities(mapped);
                    }
                }
            } catch (error) {
                console.error("Activity fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-100">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Recent Activity</h3>
                <button className="text-[10px] font-black uppercase tracking-widest text-premium-blue hover:opacity-80 transition-opacity">
                    View All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-premium-blue/20 border-t-premium-blue rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Syncing events...</p>
                    </div>
                ) : activities.length > 0 ? (
                    <div className="space-y-6">
                        {activities.map((activity) => {
                            const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
                            const Icon = config.icon;
                            
                            return (
                                <div key={activity.id} className="flex gap-4 group cursor-default p-2 rounded-2xl hover:bg-slate-50/50 transition-colors">
                                    <div className="mt-0.5">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm shrink-0",
                                            config.color
                                        )}>
                                            <Icon size={14} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-[13px] font-bold text-slate-900 truncate tracking-tight uppercase tracking-tighter">
                                                {activity.title}
                                            </p>
                                            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-2">
                                                {formatTime(activity.time)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 leading-snug line-clamp-2">
                                            {activity.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <Clock size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No recent activity</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Everything is up to date.</p>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">Executive Shortcuts</h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Add Student', icon: UserPlus, color: 'bg-premium-blue' },
                        { label: 'Msg All', icon: MessageSquare, color: 'bg-indigo-600' },
                        { label: 'Fee Report', icon: CreditCard, color: 'bg-slate-900' },
                        { label: 'Search', icon: Search, color: 'bg-slate-400' }
                    ].map((btn) => (
                        <button 
                            key={btn.label} 
                            onClick={() => handleShortcut(btn.label)}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100 hover:border-premium-blue/40 hover:shadow-sm transition-all group"
                        >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm", btn.color)}>
                                <btn.icon size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-premium-blue">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function formatTime(date) {
    if (!date || isNaN(date.getTime())) return '...';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
