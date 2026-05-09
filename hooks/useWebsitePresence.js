"use client";

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const useWebsitePresence = (instituteId, pageSlug, onPageUpdate) => {
    const [presence, setPresence] = useState([]);
    const [pusher, setPusher] = useState(null);

    useEffect(() => {
        if (!instituteId || !PUSHER_KEY) return;

        const pusherClient = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
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
        };
    }, [instituteId, pageSlug]);

    return { presence, pusher };
};
