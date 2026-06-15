"use client";

import { useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';

export const useWebsitePresence = (instituteId, pageSlug, onPageUpdate) => {
    const [presence, setPresence] = useState([]);
    const [pusher, setPusher] = useState(null);
    const [pusherConfig, setPusherConfig] = useState(null);

    const onPageUpdateRef = useRef(onPageUpdate);
    useEffect(() => {
        onPageUpdateRef.current = onPageUpdate;
    }, [onPageUpdate]);

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
            authEndpoint: '/api/v1/chat/pusher-auth',
        });

        pusherClient.connection.bind('error', (err) => {
            if (err && Object.keys(err).length > 0) {
                console.warn('Pusher Connection Warning:', err);
            }
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
            if (onPageUpdateRef.current) onPageUpdateRef.current(data.sections);
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
            pusherClient.disconnect();
        };
    }, [instituteId, pageSlug, pusherConfig]);

    return { presence, pusher };
};
