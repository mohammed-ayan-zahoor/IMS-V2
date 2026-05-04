"use client";

import { useState, useEffect } from "react";
import { 
    UserPlus, 
    MessageSquare, 
    CreditCard, 
    Clock, 
    Search,
    BookOpen,
    Layers,
    FileText,
    Calendar,
    UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function ActivityFeed() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleShortcut = (label) => {
        switch (label) {
            case 'Add Student':
                router.push('/admin/students?add=true');
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

    const shortcuts = [
        { label: 'Add Student', icon: UserPlus, color: 'text-blue-600', href: '/admin/students?add=true' },
        { label: 'Msg All', icon: MessageSquare, color: 'text-indigo-600', href: '/admin/chat' },
        { label: 'Fee Report', icon: CreditCard, color: 'text-slate-900', href: '/admin/fees' },
        { label: 'Search', icon: Search, color: 'text-slate-400', href: '#' }
    ];

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
        <div className="flex flex-col h-full bg-white border-l border-slate-100 min-w-0 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
                <Link href="/admin/logs" className="text-[11px] font-bold text-premium-blue hover:underline">View All</Link>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6 min-w-0">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-premium-blue/20 border-t-premium-blue rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Syncing...</p>
                    </div>
                ) : activities.length > 0 ? (
                    activities.map((activity) => {
                        const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
                        const Icon = config.icon;
                        return (
                            <div key={activity.id} className="flex gap-4 min-w-0">
                                <div className="shrink-0">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm", config.color)}>
                                        <Icon size={14} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest truncate mb-0.5">
                                        {activity.title}
                                    </p>
                                    <p className="text-[12px] text-slate-500 leading-snug break-words">
                                        {activity.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                                        {formatTime(activity.time)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">No recent activity</p>
                    </div>
                )}
            </div>

            {/* Quick Actions / Shortcuts */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 shrink-0 min-w-0">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Executive Shortcuts</h4>
                <div className="grid grid-cols-2 gap-3 min-w-0">
                    {shortcuts.map((shortcut, index) => (
                        <button 
                            key={index} 
                            onClick={() => handleShortcut(shortcut.label)}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100 hover:border-premium-blue/40 hover:shadow-sm transition-all group min-w-0 overflow-hidden"
                        >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-premium-blue group-hover:text-white group-hover:border-premium-blue transition-all", shortcut.color)}>
                                <shortcut.icon size={14} />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate w-full text-center group-hover:text-premium-blue transition-colors">
                                {shortcut.label}
                            </span>
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
