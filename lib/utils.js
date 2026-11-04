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

/**
 * Convert a number to English words (up to 99,999)
 */
export function numberToWords(num) {
    if (num === null || num === undefined || isNaN(num)) return '';
    num = Math.floor(Math.abs(num));
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num < 20) return ones[num];
    if (num < 100) return (tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '')).trim();
    if (num < 1000) {
        return (ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '')).trim();
    }
    if (num < 100000) {
        return (numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '')).trim();
    }
    return num.toString();
}

/**
 * Convert calendar year to formal English words (e.g. 2017 -> "Two Thousand Seventeen")
 */
export function yearToWords(year) {
    if (!year || isNaN(year)) return '';
    const y = parseInt(year, 10);
    if (y >= 2000 && y < 2100) {
        const rem = y - 2000;
        if (rem === 0) return 'Two Thousand';
        return ('Two Thousand ' + numberToWords(rem)).trim();
    }
    if (y >= 1900 && y < 2000) {
        const rem = y - 1900;
        if (rem === 0) return 'Nineteen Hundred';
        return ('Nineteen ' + numberToWords(rem)).trim();
    }
    if (y >= 1800 && y < 1900) {
        const rem = y - 1800;
        if (rem === 0) return 'Eighteen Hundred';
        return ('Eighteen ' + numberToWords(rem)).trim();
    }
    const century = Math.floor(y / 100);
    const rem = y % 100;
    return `${numberToWords(century)} ${rem === 0 ? 'Hundred' : numberToWords(rem)}`.trim();
}

/**
 * Convert Date of Birth or date string to formal words for Indian certificates
 * (e.g. 2017-04-22 -> "Twenty Second April Two Thousand Seventeen")
 */
export function dateToWords(dateInput, { ordinal = true } = {}) {
    if (!dateInput) return 'N/A';

    let day, month, year;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        const parts = dateInput.substring(0, 10).split('-');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
    } else {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'N/A';
        day = d.getDate();
        month = d.getMonth();
        year = d.getFullYear();
    }

    const ordinalDays = [
        '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
        'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth',
        'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
        'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second', 'Twenty Third',
        'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh',
        'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First'
    ];

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayWord = ordinal
        ? (ordinalDays[day] || numberToWords(day))
        : numberToWords(day);
    const monthWord = months[month] || '';
    const yearWord = yearToWords(year);

    return `${dayWord} ${monthWord} ${yearWord}`.trim() || 'N/A';
}

export function dayToWords(dateInput, { ordinal = true } = {}) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const ordinalDays = [
        '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
        'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth',
        'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
        'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second', 'Twenty Third',
        'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh',
        'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First'
    ];
    return ordinal ? (ordinalDays[day] || numberToWords(day)) : numberToWords(day);
}

export function monthToWords(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[d.getMonth()] || '';
}
