"use client";

import { useState, useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Send, User as UserIcon, Users, Reply, X, ArrowLeft, Trash2, MoreVertical, CheckSquare, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function ChatWindow({ conversation, currentUserId, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "danger" });
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const messageRefs = useRef({});

    const isBatch = conversation?.type === 'batch';
    const otherParticipant = !isBatch ? conversation?.participants?.find(p => p._id !== currentUserId) : null;

    let title = 'Group Chat';
    if (isBatch) {
        title = conversation?.batch?.name || 'Group Chat';
    } else {
        const firstName = otherParticipant?.profile?.firstName || 'Unknown';
        const lastName = otherParticipant?.profile?.lastName || '';
        title = `${firstName} ${lastName}`.trim();
    }

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedMessageIds([]);
    };

    const toggleMessageSelection = (msgId) => {
        setSelectedMessageIds(prev => 
            prev.includes(msgId) 
                ? prev.filter(id => id !== msgId) 
                : [...prev, msgId]
        );
    };

    const bulkDeleteMessages = async () => {
        if (selectedMessageIds.length === 0) return;
        
        setConfirmConfig({
            isOpen: true,
            title: "Delete Messages",
            message: `Are you sure you want to delete ${selectedMessageIds.length} selected messages? This will mark them as deleted for everyone.`,
            type: "danger",
            confirmText: "Delete selected",
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsDeleting(true);
                try {
                    const res = await fetch('/api/v1/chat/messages/bulk-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messageIds: selectedMessageIds,
                            conversationId: conversation._id
                        })
                    });
                    if (!res.ok) throw new Error("Failed to delete messages");
                    
                    toast.success(`${selectedMessageIds.length} messages deleted`);
                    setIsSelectionMode(false);
                    setSelectedMessageIds([]);
                } catch (err) {
                    toast.error("Could not delete messages");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const scrollToMessage = (msgId) => {
        const element = messageRefs.current[msgId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(msgId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
        }
    };

    // Fetch initial messages when conversation changes
    useEffect(() => {
        if (!conversation) return;

        const controller = new AbortController();

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/v1/chat/messages?conversationId=${conversation._id}`, {
                    signal: controller.signal
                });
                if (!res.ok) throw new Error("Failed to load messages");
                const data = await res.json();
                setMessages(data.messages);
            } catch (err) {
                if (err.name === 'AbortError') return;
                toast.error("Could not load messages");
            }
        };
        fetchMessages();

        return () => controller.abort();
    }, [conversation]);

    // Subscribe to Pusher channel for real-time updates
    useEffect(() => {
        if (!conversation) return;

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            authEndpoint: '/api/v1/chat/pusher-auth',
        });

        const channelName = `presence-conversation-${conversation._id}`;
        const channel = pusher.subscribe(channelName);

        channel.bind('new-message', (message) => {
            setMessages((prev) => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
        });

        channel.bind('message-deleted', ({ messageId }) => {
            setMessages((prev) => prev.map(m => 
                m._id === messageId ? { ...m, deletedAt: new Date() } : m
            ));
        });
        channel.bind('messages-bulk-deleted', ({ messageIds }) => {
            setMessages((prev) => prev.map(m => 
                messageIds.includes(m._id) ? { ...m, deletedAt: new Date() } : m
            ));
        });

        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [conversation]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-focus on reply
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyingTo]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation || isLoading) return;

        setIsLoading(true);
        const textToSend = newMessage;
        setNewMessage("");

        try {
            const res = await fetch('/api/v1/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversation._id,
                    text: textToSend,
                    ...(replyingTo && { replyTo: replyingTo._id })
                })
            });

            if (!res.ok) throw new Error("Failed to send");

            const data = await res.json();
            setMessages(prev => {
                if (prev.some(m => m._id === data.message._id)) return prev;
                return [...prev, data.message];
            });

        } catch (err) {
            toast.error("Message failed to send");
            setNewMessage(textToSend);
        } finally {
            setReplyingTo(null);
            setIsLoading(false);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        
        try {
            const res = await fetch(`/api/v1/chat/messages/${messageId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Message deleted");
        } catch (err) {
            toast.error("Could not delete message");
        }
    };

    const deleteConversation = async () => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Entire Chat",
            message: "Permanently delete this entire conversation? This cannot be undone and the chat will vanish for all participants.",
            type: "danger",
            confirmText: "Delete Chat Permanently",
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsDeleting(true);
                try {
                    const res = await fetch(`/api/v1/chat/conversations/${conversation._id}`, {
                        method: 'DELETE'
                    });
                    if (!res.ok) throw new Error("Failed to delete chat");
                    toast.success("Chat deleted successfully");
                    if (onBack) onBack(); 
                } catch (err) {
                    toast.error("Could not delete chat");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400">
                <Send className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a conversation to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white h-full relative">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white z-10 shadow-sm relative">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 mr-1 hover:bg-slate-100 rounded-full md:hidden text-slate-600 transition-colors"
                            aria-label="Back to messages"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 bg-premium-blue/10 rounded-full flex items-center justify-center text-premium-blue shrink-0">
                        {isBatch ? <Users className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="font-medium text-gray-900">{title}</h2>
                        <p className="text-xs text-gray-500">{isBatch ? 'Batch Group' : otherParticipant?.role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                        <>
                            <span className="text-xs font-bold text-premium-blue px-2 py-1 bg-premium-blue/10 rounded-lg mr-2">
                                {selectedMessageIds.length} Selected
                            </span>
                            <button 
                                onClick={bulkDeleteMessages}
                                disabled={selectedMessageIds.length === 0 || isDeleting}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-30"
                                title="Delete Selected"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button 
                                onClick={toggleSelectionMode}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-all font-bold text-xs px-3"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={toggleSelectionMode}
                                className="p-2 text-slate-400 hover:text-premium-blue hover:bg-premium-blue/5 rounded-full transition-all"
                                title="Select Messages"
                            >
                                <CheckSquare size={20} />
                            </button>
                            <button 
                                onClick={deleteConversation}
                                disabled={isDeleting}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Delete Chat"
                            >
                                <Trash2 size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-1 scroll-smooth">
                {messages.map((msg, index) => {
                    const isSender = msg.sender?._id === currentUserId || msg.sender === currentUserId;
                    const isDeleted = !!msg.deletedAt;
                    const isSelected = selectedMessageIds.includes(msg._id);
                    
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                    const isSameSenderAsPrev = prevMsg && (prevMsg.sender?._id || prevMsg.sender) === (msg.sender?._id || msg.sender);
                    const isSameMinuteAsPrev = prevMsg && format(new Date(prevMsg.createdAt), 'h:mm') === format(new Date(msg.createdAt), 'h:mm');
                    const isAttachedToPrev = isSameSenderAsPrev && isSameMinuteAsPrev && !isDeleted && !prevMsg.deletedAt;

                    const isSameSenderAsNext = nextMsg && (nextMsg.sender?._id || nextMsg.sender) === (msg.sender?._id || msg.sender);
                    const isSameMinuteAsNext = nextMsg && format(new Date(nextMsg.createdAt), 'h:mm') === format(new Date(msg.createdAt), 'h:mm');
                    const isAttachedToNext = isSameSenderAsNext && isSameMinuteAsNext && !isDeleted && !nextMsg.deletedAt;

                    const isFirstInGroup = !isAttachedToPrev;
                    const isLastInGroup = !isAttachedToNext;

                    const showName = isBatch && !isSender && isFirstInGroup;
                    const senderRole = msg.sender?.role;

                    return (
                        <div 
                            key={msg._id} 
                            ref={el => messageRefs.current[msg._id] = el}
                            onClick={() => isSelectionMode && !isDeleted && toggleMessageSelection(msg._id)}
                            className={cn(
                                "flex flex-col group transition-all duration-500",
                                isSender ? "items-end" : "items-start",
                                !isAttachedToPrev ? "mt-4" : "mt-0",
                                highlightedMessageId === msg._id && "scale-[1.02] z-20",
                                isSelectionMode && !isDeleted && "cursor-pointer hover:opacity-80"
                            )}
                        >
                            {isFirstInGroup && (showName || senderRole === 'admin' || senderRole === 'super_admin' || senderRole === 'instructor') && (
                                <div className={`flex items-center gap-1.5 mb-1 mx-2 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {showName && (
                                        <span className="text-[11px] font-bold text-slate-900 group-hover:text-premium-blue transition-colors">
                                            {msg.sender?.profile?.firstName} {msg.sender?.profile?.lastName}
                                        </span>
                                    )}
                                    {(senderRole === 'admin' || senderRole === 'super_admin') && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-premium-blue/10 text-premium-blue border border-premium-blue/20">
                                            Admin
                                        </span>
                                    )}
                                    {senderRole === 'instructor' && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            Instructor
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 max-w-[75%]">
                                {isSelectionMode && !isDeleted && (
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                        isSelected ? "bg-premium-blue border-premium-blue" : "border-slate-300 bg-white"
                                    )}>
                                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                )}
                                {!isSender && !isDeleted && !isSelectionMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                                        className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-premium-blue hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        title="Reply"
                                    >
                                        <Reply size={14} />
                                    </button>
                                )}
                                <div className={cn(
                                    "flex flex-col px-4 py-2 transition-all shadow-sm relative min-w-[120px]",
                                    isSender 
                                        ? (isDeleted ? "bg-slate-200 text-slate-500 border-none" : "bg-premium-blue text-white") 
                                        : (isDeleted ? "bg-slate-100 text-slate-400 border border-dashed border-slate-300" : "bg-white border border-gray-200 text-gray-800"),
                                    // Bubble logic
                                    isSender ? (
                                        isAttachedToPrev ? "rounded-l-2xl rounded-r-sm" : "rounded-2xl rounded-tr-sm"
                                    ) : (
                                        isAttachedToPrev ? "rounded-r-2xl rounded-l-sm" : "rounded-2xl rounded-tl-sm"
                                    ),
                                    isAttachedToNext && (isSender ? "rounded-br-sm" : "rounded-bl-sm"),
                                    // Pulse effect
                                    highlightedMessageId === msg._id && (isSender ? "ring-4 ring-white/30 animate-pulse-fast shadow-xl" : "ring-4 ring-premium-blue/30 animate-pulse-fast shadow-xl"),
                                    // Selection effect
                                    isSelected && "ring-4 ring-premium-blue/40 scale-[0.98]"
                                )}>
                                    {msg.replyTo && !isDeleted && (
                                        <div 
                                            onClick={(e) => { 
                                                if (isSelectionMode) return; // Don't scroll in selection mode
                                                e.stopPropagation(); 
                                                scrollToMessage(msg.replyTo._id); 
                                            }}
                                            className={cn(
                                                "mb-1 p-2 rounded relative text-xs border-l-2 cursor-pointer transition-colors",
                                                isSender ? "bg-white/10 border-white/40 text-blue-50 hover:bg-white/20" : "bg-slate-50 border-premium-blue text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <p className={`font-bold mb-0.5 ${isSender ? 'text-white' : 'text-premium-blue'}`}>
                                                {msg.replyTo.sender?.profile?.firstName || 'Someone'}
                                            </p>
                                            <p className="truncate opacity-90 max-w-[200px]">{msg.replyTo.text}</p>
                                        </div>
                                    )}
                                    {isDeleted ? (
                                        <p className="text-xs italic flex items-center gap-1.5 py-1">
                                            <Trash2 size={12} className="opacity-50" />
                                            This message was deleted
                                        </p>
                                    ) : (
                                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                    )}
                                </div>
                                {isSender && !isDeleted && !isSelectionMode && (
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                                            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-premium-blue hover:bg-slate-200 transition-all"
                                            title="Reply"
                                        >
                                            <Reply size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isLastInGroup && !isDeleted && (
                                <span className={cn(
                                    "text-[9px] text-gray-400 mt-1 mx-2 uppercase font-bold tracking-tight",
                                    isSender ? "text-right" : "text-left"
                                )}>
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Block */}
            <div className="bg-white border-t border-gray-200 flex flex-col">
                {replyingTo && (
                    <div className="p-3 bg-slate-50 border-b border-gray-100 flex items-start justify-between gap-3 relative">
                        <div className="w-1 h-full absolute left-0 top-0 bg-premium-blue"></div>
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-bold text-premium-blue mb-0.5">
                                Replying to {replyingTo.sender?.profile?.firstName || 'Someone'}
                            </p>
                            <p className="text-sm text-slate-600 truncate">{replyingTo.text}</p>
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <form onSubmit={sendMessage} className="p-4 flex gap-2 items-end">
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-premium-blue/20 focus:border-premium-blue max-h-32 min-h-[44px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isLoading}
                        className="bg-premium-blue text-white p-3 rounded-xl hover:bg-premium-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>

            <ConfirmDialog
                {...confirmConfig}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
