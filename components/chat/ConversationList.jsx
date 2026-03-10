"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, User, Search } from "lucide-react";

export default function ConversationList({
    conversations = [],
    activeConversation,
    onSelectConversation,
    currentUserId
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

            <div className="flex-1 overflow-y-auto">
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
                            className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left ${activeConversation?._id === conv._id ? 'bg-premium-blue/10' : ''}`}
                        >
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                {isBatch ? <Users className="w-5 h-5 text-gray-500" /> : <User className="w-5 h-5 text-gray-500" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between mb-1">
                                    <h3 className="text-sm font-medium text-gray-900 truncate">
                                        {title}
                                    </h3>
                                    {conv.lastMessageAt && (
                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                    {subtitle}
                                </p>
                            </div>
                        </button>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        No conversations found
                    </div>
                )}
            </div>
        </div>
    );
}
