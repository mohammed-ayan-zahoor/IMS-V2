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
    UserCog,
    Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ACTIVITY_CONFIG = {
    student: { icon: UserPlus, color: "text-blue-600" },
    enquiry: { icon: MessageSquare, color: "text-orange-500" },
    payment: { icon: CreditCard, color: "text-emerald-600" },
    course: { icon: BookOpen, color: "text-indigo-600" },
    batch: { icon: Layers, color: "text-purple-600" },
    subject: { icon: Layers, color: "text-cyan-600" },
    attendance: { icon: Calendar, color: "text-rose-500" },
    material: { icon: FileText, color: "text-amber-600" },
    notice: { icon: Megaphone, color: "text-blue-500" },
    search: { icon: Search, color: "text-slate-500" },
    user: { icon: UserCog, color: "text-slate-500" },
    default: { icon: Clock, color: "text-slate-400" }
};

function mapActivityEntry(entry) {
    const actorName = entry.actor?.profile?.firstName || 'Staff';
    const details = entry.details || {};
    const rawAction = (entry.action || '').toLowerCase();

    if (rawAction === 'student.create' || rawAction === 'student_create') {
        return {
            type: 'student',
            title: 'New Student Admission',
            description: `${actorName} enrolled ${details.name || details.studentName || 'a student'}`
        };
    }
    if (rawAction === 'student.update' || rawAction === 'student_update') {
        return {
            type: 'student',
            title: 'Student Profile Updated',
            description: `${actorName} updated record for ${details.name || 'a student'}`
        };
    }
    if (rawAction.includes('student_fetch') || rawAction.includes('student.fetch') || rawAction.includes('session')) {
        return {
            type: 'search',
            title: 'Student Search',
            description: `${actorName} looked up student records`
        };
    }
    if (rawAction === 'enquiry.create' || rawAction === 'enquiry_create') {
        return {
            type: 'enquiry',
            title: 'New Admission Enquiry',
            description: `Enquiry registered for ${details.courseName || 'a program'}`
        };
    }
    if (rawAction === 'fee.payment' || rawAction === 'fee_payment') {
        return {
            type: 'payment',
            title: 'Fee Payment Received',
            description: `Payment of ₹${details.amount?.toLocaleString() || '0'} recorded`
        };
    }
    if (rawAction.includes('course')) {
        return {
            type: 'course',
            title: 'Course Management',
            description: `${actorName} updated course schedule`
        };
    }
    if (rawAction.includes('attendance')) {
        return {
            type: 'attendance',
            title: 'Attendance Marked',
            description: `${actorName} logged daily batch attendance`
        };
    }
    if (rawAction.includes('notice')) {
        return {
            type: 'notice',
            title: 'Notice Published',
            description: `Announcement dispatched to students`
        };
    }

    // Clean human fallback (strips raw snake_case / dot notation and uppercase strings)
    const cleanTitle = entry.action
        ? entry.action.replace(/[_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'System Activity';
    const cleanDesc = `${actorName} updated system records`;

    return {
        type: 'default',
        title: cleanTitle,
        description: cleanDesc
    };
}

function processAndGroupActivities(rawFeed) {
    if (!Array.isArray(rawFeed) || rawFeed.length === 0) return [];

    const grouped = [];
    let currentGroup = null;

    for (const entry of rawFeed) {
        const actorId = entry.actor?._id || entry.actor?.profile?.firstName || 'staff';
        const actionKey = `${actorId}:${entry.action}`;
        const mapped = mapActivityEntry(entry);

        if (currentGroup && currentGroup.actionKey === actionKey) {
            currentGroup.count += 1;
        } else {
            if (currentGroup) {
                grouped.push(finalizeGroup(currentGroup));
            }
            currentGroup = {
                id: entry._id,
                actionKey,
                type: mapped.type,
                title: mapped.title,
                baseDescription: mapped.description,
                actorName: entry.actor?.profile?.firstName || 'Staff',
                count: 1,
                time: new Date(entry.createdAt)
            };
        }
    }
    if (currentGroup) {
        grouped.push(finalizeGroup(currentGroup));
    }
    return grouped;
}

function finalizeGroup(group) {
    let finalDesc = group.baseDescription;
    if (group.count > 1) {
        if (group.type === 'search') {
            finalDesc = `${group.actorName} looked up student records (${group.count} times)`;
        } else {
            finalDesc = `${group.baseDescription} (${group.count} times)`;
        }
    }
    return {
        id: group.id,
        type: group.type,
        title: group.title,
        description: finalDesc,
        time: group.time
    };
}

export default function ActivityFeed({ className }) {
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
        { label: 'Add Student', icon: UserPlus, color: 'text-blue-600 hover:text-blue-700', bg: 'hover:bg-blue-50/40' },
        { label: 'Msg All', icon: MessageSquare, color: 'text-indigo-600 hover:text-indigo-700', bg: 'hover:bg-indigo-50/40' },
        { label: 'Fee Report', icon: CreditCard, color: 'text-emerald-600 hover:text-emerald-700', bg: 'hover:bg-emerald-50/40' },
        { label: 'Search', icon: Search, color: 'text-slate-600 hover:text-slate-900', bg: 'hover:bg-slate-50/60' }
    ];

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/v1/dashboard/activity');
                if (res.ok) {
                    const data = await res.json();
                    if (data.activityFeed) {
                        const processed = processAndGroupActivities(data.activityFeed);
                        setActivities(processed);
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
        <div className={cn("flex flex-col bg-white rounded-lg border border-slate-100 min-w-0 overflow-hidden", className)}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Live audit trail & actions</p>
                </div>
                <Link href="/admin/audit-logs" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    View All →
                </Link>
            </div>

            {/* Activity Feed List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0 max-h-[340px]">
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-400">Loading activity...</p>
                    </div>
                ) : activities.length > 0 ? (
                    activities.map((activity) => {
                        const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
                        const Icon = config.icon;
                        return (
                            <div key={activity.id} className="flex gap-3 items-start min-w-0 pb-3.5 border-b border-slate-50 last:border-b-0 last:pb-0">
                                <Icon size={15} className={cn("mt-0.5 shrink-0", config.color)} />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <h4 className="text-xs font-semibold text-slate-900 truncate">
                                            {activity.title}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0 font-mono">
                                            {formatTime(activity.time)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed break-words">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-10">
                        <p className="text-xs font-medium text-slate-400">No recent activity recorded</p>
                    </div>
                )}
            </div>

            {/* Executive Shortcuts */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 shrink-0 min-w-0">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Executive Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 min-w-0">
                    {shortcuts.map((shortcut, index) => (
                        <button 
                            key={index} 
                            onClick={() => handleShortcut(shortcut.label)}
                            className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border border-slate-200/80 bg-white transition-all cursor-pointer hover:border-slate-300 hover:shadow-xs group min-w-0 text-left",
                                shortcut.bg
                            )}
                        >
                            <shortcut.icon size={15} className={cn("transition-transform group-hover:scale-110 shrink-0", shortcut.color)} />
                            <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-slate-900">
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
