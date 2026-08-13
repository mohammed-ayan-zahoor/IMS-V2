"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    Bell, 
    CalendarDays, 
    UserPlus, 
    HelpCircle, 
    Megaphone, 
    CheckCheck, 
    Check, 
    X,
    Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function NotificationBellDropdown() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/v1/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const handleMarkAsRead = async (notif) => {
        if (!notif.read) {
            try {
                await fetch("/api/v1/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notificationId: notif._id })
                });
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (e) {
                console.error("Failed to mark notification read", e);
            }
        }

        setIsOpen(false);
        if (notif.link) {
            router.push(notif.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/v1/notifications/read-all", { method: "POST" });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error("Failed to mark all read", e);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case "LEAVE_REQUEST":
                return <CalendarDays size={15} className="text-amber-500" />;
            case "ADMISSION":
                return <UserPlus size={15} className="text-emerald-500" />;
            case "ENQUIRY":
                return <HelpCircle size={15} className="text-blue-500" />;
            case "NOTICE":
                return <Megaphone size={15} className="text-purple-500" />;
            default:
                return <Bell size={15} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative rounded-lg hover:bg-slate-100 outline-none"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg border border-slate-200 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                            >
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification Feed List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs font-medium">
                                <Bell size={20} className="mx-auto mb-1.5 opacity-50" />
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    onClick={() => handleMarkAsRead(n)}
                                    className={cn(
                                        "p-3 flex items-start gap-3 cursor-pointer transition-colors text-left",
                                        n.read ? "bg-white hover:bg-slate-50" : "bg-slate-50/70 hover:bg-slate-100/80"
                                    )}
                                >
                                    <div className="p-2 rounded-md bg-white border border-slate-200 shrink-0 mt-0.5 shadow-2xs">
                                        {getIcon(n.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={cn("text-xs leading-snug truncate", n.read ? "font-bold text-slate-800" : "font-black text-slate-900")}>
                                                {n.title}
                                            </p>
                                            {!n.read && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                            <Clock size={10} />
                                            {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "Just now"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
