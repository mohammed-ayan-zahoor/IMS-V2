"use client";

import { useState, useEffect } from "react";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import PusherClient from "pusher-js";
import toast from "react-hot-toast";

export default function ChatLayout({ currentUserId }) {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pusherConfig, setPusherConfig] = useState(null);

    // Fetch dynamic Pusher configuration
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/v1/pusher/config');
                if (res.ok) {
                    const data = await res.json();
                    setPusherConfig(data);
                }
            } catch (err) {
                console.error("Failed to load Pusher config dynamically:", err);
            }
        };
        fetchConfig();
    }, []);

    // Initialize Pusher Beams for web push notifications
    useEffect(() => {
        if (!currentUserId || !pusherConfig?.beamsInstanceId) return;

        let beamsClient;
        const initBeams = async () => {
            try {
                const { Client, TokenProvider } = await import('@pusher/push-notifications-web');
                beamsClient = new Client({
                    instanceId: pusherConfig.beamsInstanceId,
                    serviceWorkerRegistration: await navigator.serviceWorker.register('/service-worker.js'),
                });

                await beamsClient.start();

                // Authenticate with our backend so this device is linked to the userId
                const tokenProvider = new TokenProvider({
                    url: '/api/v1/chat/beams-auth',
                });
                await beamsClient.setUserId(currentUserId, tokenProvider);

            } catch (err) {
                // Non-fatal: browser may not support service workers or user denied permission
                console.warn('Pusher Beams init failed:', err.message);
            }
        };

        initBeams();

        return () => {
            // No need to stop beams on unmount - it stays registered
        };
    }, [currentUserId, pusherConfig]);

    useEffect(() => {
        if (!currentUserId || !pusherConfig?.key) return;

        const pusher = new PusherClient(pusherConfig.key, {
            cluster: pusherConfig.cluster || 'mt1',
            authEndpoint: '/api/v1/chat/pusher-auth',
        });

        const userChannel = `user-updates-${currentUserId}`;
        const channel = pusher.subscribe(userChannel);

        channel.bind('conversation-deleted', ({ conversationId }) => {
            setConversations((prev) => prev.filter(c => c._id !== conversationId));
            if (activeConversation?._id === conversationId) {
                setActiveConversation(null);
                toast.success("This conversation was deleted");
            }
        });

        return () => {
            pusher.unsubscribe(userChannel);
            pusher.disconnect();
        };
    }, [currentUserId, activeConversation, pusherConfig]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchConversations = async () => {
            try {
                const res = await fetch("/api/v1/chat/conversations", {
                    signal: controller.signal
                });
                if (!res.ok) throw new Error("Failed to fetch conversations");
                const data = await res.json();
                setConversations(Array.isArray(data.conversations) ? data.conversations : []);
            } catch (err) {
                if (err.name === 'AbortError') return;
                toast.error("Could not load chat conversations");
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();

        return () => controller.abort();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white animate-pulse">
                <div className="h-8 w-8 rounded-full border-2 border-premium-blue border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-white overflow-hidden">
            {/* Mobile view only shows list until clicked, then hides list. Desktop shows both. */}
            <div className={`w-full md:w-80 md:flex flex-shrink-0 ${activeConversation ? 'hidden md:block' : 'block'}`}>
                <ConversationList
                    conversations={conversations}
                    activeConversation={activeConversation}
                    onSelectConversation={setActiveConversation}
                    currentUserId={currentUserId}
                    isLoading={isLoading}
                />
            </div>

            <div className={`flex-1 md:flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
                <ChatWindow
                    conversation={activeConversation}
                    currentUserId={currentUserId}
                    onBack={() => setActiveConversation(null)}
                />
            </div>
        </div>
    );
}
