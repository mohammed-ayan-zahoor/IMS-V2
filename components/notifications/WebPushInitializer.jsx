"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Initialises Pusher Beams for the given userId.
 * Called automatically when permission is already granted,
 * and exported so the Settings page can call it on a user gesture.
 */
export async function enableWebPush(userId) {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return false;

    // Ask permission if not yet decided — must be called from a user gesture to avoid Chrome suppression
    if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") return false;
    }
    if (Notification.permission !== "granted") return false;

    const configRes = await fetch("/api/v1/pusher/config");
    if (!configRes.ok) return false;
    const pusherConfig = await configRes.json();
    if (!pusherConfig?.beamsInstanceId) return false;

    const { Client, TokenProvider } = await import("@pusher/push-notifications-web");

    const beamsClient = new Client({
        instanceId: pusherConfig.beamsInstanceId,
        serviceWorkerRegistration: await navigator.serviceWorker.register("/service-worker.js"),
    });

    await beamsClient.start();
    await beamsClient.setUserId(userId, new TokenProvider({ url: "/api/v1/chat/beams-auth" }));
    return true;
}

/**
 * WebPushInitializer
 *
 * Silently initialises Beams on mount when permission is already granted.
 * For the first-time permission prompt, use the Settings page button (user gesture).
 */
export default function WebPushInitializer() {
    const { data: session } = useSession();
    const initializedRef = useRef(false);

    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId || initializedRef.current) return;
        if (Notification.permission !== "granted") return; // don't prompt silently

        enableWebPush(userId)
            .then((ok) => { if (ok) initializedRef.current = true; })
            .catch((err) => console.warn("[WebPush] Init error:", err.message));
    }, [session?.user?.id]);

    return null;
}
