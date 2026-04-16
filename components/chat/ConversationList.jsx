"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, User, Search, MessageSquarePlus, MessageCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/shared/Skeleton";

export default function ConversationList({
    conversations = [],
    activeConversation,
    onSelectConversation,
    currentUserId,
    isLoading
}) {
    const [search, setSearch] = useState("");

    const filtered = conversations.filter(c => {
        if (c.type === 'batch' && c.batch?.name) {
            return c.batch.name.toLowerCase().includes(search.toLowerCase());
        }
        const otherParticipant = c.participants.find(p => p._id !== currentUserId);
        if (otherParticipant) {
            const name = `${otherParticipant.profile.firstName} ${otherParticipant.profile.lastName}`;
            return name.toLowerCase().includes(search.toLowerCase());
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="flex h-full w-full bg-white">
                <div className="w-80 border-r border-slate-100 p-4 space-y-6 hidden md:block">
                    <Skeleton className="h-10 w-full" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}
                    </div>
                </div>
                <div className="flex-1 p-8 space-y-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="flex-1 w-full rounded-2xl h-[calc(100%-80px)]" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-premium-blue/20 focus:border-premium-blue"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative">
                {filtered.map(conv => {
                    const isBatch = conv.type === 'batch';
                    const otherParticipant = !isBatch ? conv.participants.find(p => p._id !== currentUserId) : null;

                    let title = isBatch
                        ? (conv.batch?.name || "Unnamed Batch")
                        : (otherParticipant?.profile?.firstName && otherParticipant?.profile?.lastName)
                            ? `${otherParticipant.profile.firstName} ${otherParticipant.profile.lastName}`
                            : "Unknown User"; let subtitle = conv.lastMessage?.text || "New conversation";

                    return (
                        <button
                            key={conv._id}
                            onClick={() => onSelectConversation(conv)}
                            className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left ${activeConversation?._id === conv._id ? 'bg-premium-blue/10 border-l-4 border-l-premium-blue' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex-shrink-0 w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                                {isBatch ? <Users className="w-5 h-5 text-slate-500" /> : (
                                    otherParticipant?.profile?.image ? <img src={otherParticipant.profile.image} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between mb-1">
                                    <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">
                                        {title}
                                    </h3>
                                    {conv.lastMessageAt && (
                                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2 uppercase">
                                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-slate-500 truncate line-clamp-1">
                                    {subtitle}
                                </p>
                            </div>
                        </button>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-64">
                         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                            <MessageCircle size={32} />
                         </div>
                         <h4 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">No Messages Yet</h4>
                         <p className="text-xs font-medium text-slate-400 max-w-[180px] mx-auto">Start a conversation with your teachers or batch mates.</p>
                    </div>
                )}
            </div>

            {/* Compose FAB */}
            <div className="absolute bottom-6 right-6 z-10 md:hidden">
                <Button className="w-14 h-14 rounded-full shadow-2xl p-0 flex items-center justify-center">
                    <MessageSquarePlus size={24} />
                </Button>
            </div>
        </div>
    );
}
