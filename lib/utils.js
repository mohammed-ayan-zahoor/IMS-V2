import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(date) {
    if (!date) return "N/A";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "N/A";
    return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(amount);
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * Supports: standard watch URLs, youtu.be short links, embed URLs, and shorts
 */
export function getYoutubeVideoId(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return null;
    try {
        const url = new URL(urlStr);
        if (url.hostname.includes("youtu.be")) {
            const segments = url.pathname.split("/").filter(Boolean);
            return segments[0] || null;
        }
        if (url.hostname.includes("youtube.com")) {
            if (url.pathname.includes("/embed/")) {
                const parts = url.pathname.split("/embed/");
                return parts[1]?.split(/[?&/]/)[0] || null;
            }
            if (url.pathname.includes("/shorts/")) {
                const parts = url.pathname.split("/shorts/");
                return parts[1]?.split(/[?&/]/)[0] || null;
            }
            return url.searchParams.get("v") || null;
        }
    } catch {
        const match = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        return match ? match[1] : null;
    }
    return null;
}

/**
 * Returns the public high-quality thumbnail URL for a YouTube video URL
 */
export function getYoutubeThumbnail(urlStr) {
    const videoId = getYoutubeVideoId(urlStr);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

