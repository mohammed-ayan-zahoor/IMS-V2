"use client";

import { useState, useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { format } from "date-fns";
import { Send, User as UserIcon, Users, Reply, X, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function ChatWindow({ conversation, currentUserId, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    const isBatch = conversation?.type === 'batch';
    const otherParticipant = !isBatch ? conversation?.participants?.find(p => p._id !== currentUserId) : null;
    const title = isBatch ? conversation?.batch?.name : `${otherParticipant?.profile?.firstName} ${otherParticipant?.profile?.lastName}`;

    // Fetch initial messages when conversation changes
    useEffect(() => {
        if (!conversation) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/v1/chat/messages?conversationId=${conversation._id}`);
                if (!res.ok) throw new Error("Failed to load messages");
                const data = await res.json();
                setMessages(data.messages);
            } catch (err) {
                toast.error("Could not load messages");
            }
        };
        fetchMessages();
    }, [conversation]);

    // Subscribe to Pusher channel for real-time updates
    useEffect(() => {
        if (!conversation) return;

        // Enable pusher logging
        // PusherClient.logToConsole = true;

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            authEndpoint: '/api/v1/chat/pusher-auth',
        });

        const channelName = `presence-conversation-${conversation._id}`;
        const channel = pusher.subscribe(channelName);

        channel.bind('new-message', (message) => {
            // Add message to state if it doesn't already exist (to prevent duplicates if sent by self)
            setMessages((prev) => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
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
            // Add to state instantly for sender (Pusher will skip duplicates)
            setMessages(prev => {
                if (prev.some(m => m._id === data.message._id)) return prev;
                return [...prev, data.message];
            });

        } catch (err) {
            toast.error("Message failed to send");
            setNewMessage(textToSend); // put text back on error
        } finally {
            setReplyingTo(null);
            setIsLoading(false);
        }
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
            <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-white z-10 shadow-sm relative">
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, index) => {
                    const isSender = msg.sender?._id === currentUserId || msg.sender === currentUserId;
                    const showName = isBatch && !isSender && (index === 0 || messages[index - 1]?.sender?._id !== msg.sender?._id);

                    return (
                        <div key={msg._id} className={`flex flex-col group ${isSender ? 'items-end' : 'items-start'}`}>
                            {showName && (
                                <span className="text-xs text-gray-500 ml-2 mb-1">
                                    {msg.sender?.profile?.firstName}
                                </span>
                            )}
                            <div className="flex items-center gap-2 max-w-[75%]">
                                {!isSender && (
                                    <button
                                        onClick={() => setReplyingTo(msg)}
                                        className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-premium-blue hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        title="Reply"
                                    >
                                        <Reply size={14} />
                                    </button>
                                )}
                                <div className={`flex flex-col rounded-2xl px-4 py-2 ${isSender
                                    ? 'bg-premium-blue text-white rounded-tr-sm'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                                    }`}>
                                    {msg.replyTo && (
                                        <div className={`mb-1 p-2 rounded relative text-xs border-l-2 cursor-pointer ${isSender ? 'bg-white/10 border-white/40 text-blue-50' : 'bg-slate-50 border-premium-blue text-slate-500'}`}>
                                            <p className={`font-bold mb-0.5 ${isSender ? 'text-white' : 'text-premium-blue'}`}>
                                                {msg.replyTo.sender?.profile?.firstName || 'Someone'}
                                            </p>
                                            <p className="truncate opacity-90 max-w-[200px]">{msg.replyTo.text}</p>
                                        </div>
                                    )}
                                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                {isSender && (
                                    <button
                                        onClick={() => setReplyingTo(msg)}
                                        className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-premium-blue hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        title="Reply"
                                    >
                                        <Reply size={14} />
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 mx-1">
                                {format(new Date(msg.createdAt), 'h:mm a')}
                            </span>
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
        </div>
    );
}
