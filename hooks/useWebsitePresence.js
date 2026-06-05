"use client";

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

export const useWebsitePresence = (instituteId, pageSlug, onPageUpdate) => {
    const [presence, setPresence] = useState([]);
    const [pusher, setPusher] = useState(null);
    const [pusherConfig, setPusherConfig] = useState(null);

    // Fetch custom or fallback Pusher configurations dynamically
    useEffect(() => {
        if (!instituteId) return;
        const fetchConfig = async () => {
            try {
                const res = await fetch(`/api/v1/pusher/config?instituteId=${instituteId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPusherConfig(data);
                }
            } catch (err) {
                console.error("Failed to load website Pusher config dynamically:", err);
            }
        };
        fetchConfig();
    }, [instituteId]);

    useEffect(() => {
        if (!instituteId || !pusherConfig?.key) return;

        const pusherClient = new Pusher(pusherConfig.key, {
            cluster: pusherConfig.cluster || 'mt1',
            authEndpoint: '/api/pusher/auth',
        });

        pusherClient.connection.bind('error', (err) => {
            console.error('Pusher Connection Error:', err);
        });

        setPusher(pusherClient);

        const channelName = `presence-website-${instituteId}-${pageSlug}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', (members) => {
            const memberList = [];
            members.each(member => memberList.push(member.info));
            setPresence(memberList);
        });

        channel.bind('pusher:member_added', (member) => {
            setPresence(prev => [...prev, member.info]);
        });

        channel.bind('pusher:member_removed', (member) => {
            setPresence(prev => prev.filter(m => m.id !== member.id));
        });

        channel.bind('page-update', (data) => {
            if (onPageUpdate) onPageUpdate(data.sections);
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
            pusherClient.disconnect();
        };
    }, [instituteId, pageSlug, pusherConfig, onPageUpdate]);

    return { presence, pusher };
};
