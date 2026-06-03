"use client";
import React, { useState } from "react";

const Avatar = ({
    name,
    src,
    size = "md",
    status,
    bordered = false,
    className = "",
}) => {
    const [imgError, setImgError] = useState(false);

    const sizes = {
        xs: { box: 24, font: 9, weight: 600, ring: 1.5, statusSize: 6, statusOffset: 0 },
        sm: { box: 32, font: 11, weight: 600, ring: 1.5, statusSize: 8, statusOffset: 1 },
        md: { box: 40, font: 13, weight: 600, ring: 2, statusSize: 10, statusOffset: 1 },
        lg: { box: 48, font: 15, weight: 600, ring: 2, statusSize: 11, statusOffset: 1 },
        xl: { box: 64, font: 20, weight: 500, ring: 2.5, statusSize: 14, statusOffset: 2 },
        "2xl": { box: 80, font: 25, weight: 500, ring: 3, statusSize: 17, statusOffset: 2 },
    };

    const cfg = sizes[size] || sizes.md;

    const palettes = [
        { bg: "rgba(0,122,255,0.12)", text: "rgba(0,90,200,1)", dark: { bg: "rgba(10,132,255,0.2)", text: "rgba(10,132,255,1)" } },
        { bg: "rgba(52,199,89,0.12)", text: "rgba(30,155,60,1)", dark: { bg: "rgba(48,209,88,0.2)", text: "rgba(48,209,88,1)" } },
        { bg: "rgba(175,82,222,0.12)", text: "rgba(140,55,190,1)", dark: { bg: "rgba(191,90,242,0.2)", text: "rgba(191,90,242,1)" } },
        { bg: "rgba(255,149,0,0.12)", text: "rgba(200,110,0,1)", dark: { bg: "rgba(255,159,10,0.2)", text: "rgba(255,159,10,1)" } },
        { bg: "rgba(255,59,48,0.12)", text: "rgba(200,40,35,1)", dark: { bg: "rgba(255,69,58,0.2)", text: "rgba(255,69,58,1)" } },
        { bg: "rgba(90,200,250,0.15)", text: "rgba(0,145,195,1)", dark: { bg: "rgba(100,210,255,0.2)", text: "rgba(100,210,255,1)" } },
        { bg: "rgba(255,214,10,0.15)", text: "rgba(175,140,0,1)", dark: { bg: "rgba(255,214,10,0.2)", text: "rgba(255,204,0,1)" } },
        { bg: "rgba(255,45,85,0.12)", text: "rgba(200,30,65,1)", dark: { bg: "rgba(255,55,95,0.2)", text: "rgba(255,55,95,1)" } },
    ];

    const statusColors = {
        online: { light: "#34C759", dark: "#30D158" },
        busy: { light: "#FF3B30", dark: "#FF453A" },
        away: { light: "#FF9500", dark: "#FF9F0A" },
        offline: { light: "#8E8E93", dark: "#636366" },
    };

    const getInitials = (n) => {
        if (!n) return "";
        const parts = n.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    };

    const colorIndex = name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % palettes.length : 0;
    const palette = palettes[colorIndex];
    const initials = getInitials(name);
    const showImage = src && !imgError;

    const box = cfg.box;
    const borderVal = bordered ? `2px solid rgba(255,255,255,0.85)` : "none";

    const dot = status && statusColors[status];
    const dotSize = cfg.statusSize;
    const dotOffset = cfg.statusOffset;

    return (
        <span
            className={className}
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            <span
                style={{
                    width: box,
                    height: box,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    border: borderVal,
                    boxSizing: "border-box",
                    boxShadow: showImage
                        ? `inset 0 0 0 ${cfg.ring}px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.10)`
                        : `inset 0 0 0 ${cfg.ring}px rgba(0,0,0,0.06)`,
                    background: showImage ? "transparent" : palette.bg,
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    "--palette-bg": palette.dark.bg,
                    "--palette-text": palette.dark.text,
                }}
            >
                <style>{`
                    @media (prefers-color-scheme: dark) {
                        .apple-av-fill { background: var(--palette-bg) !important; }
                        .apple-av-text { color: var(--palette-text) !important; }
                        .apple-av-dot-online  { background: #30D158 !important; }
                        .apple-av-dot-busy    { background: #FF453A !important; }
                        .apple-av-dot-away    { background: #FF9F0A !important; }
                        .apple-av-dot-offline { background: #636366 !important; }
                    }
                `}</style>

                {showImage ? (
                    <img
                        src={src}
                        alt={name || "avatar"}
                        onError={() => setImgError(true)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : (
                    <span
                        className="apple-av-fill apple-av-text"
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: palette.bg,
                            color: palette.text,
                            fontSize: cfg.font,
                            fontWeight: cfg.weight,
                            letterSpacing: "-0.01em",
                            fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", BlinkMacSystemFont, "Helvetica Neue", sans-serif',
                            userSelect: "none",
                            lineHeight: 1,
                        }}
                    >
                        {initials}
                    </span>
                )}
            </span>

            {dot && (
                <span
                    className={`apple-av-dot-${status}`}
                    style={{
                        position: "absolute",
                        bottom: dotOffset,
                        right: dotOffset,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        background: statusColors[status].light,
                        border: "2px solid #fff",
                        boxSizing: "border-box",
                    }}
                />
            )}
        </span>
    );
};

/* ─── Avatar Group ─────────────────────────────────────────────── */
export const AvatarGroup = ({ avatars = [], max = 4, size = "md", className = "" }) => {
    const shown = avatars.slice(0, max);
    const overflow = avatars.length - max;

    const sizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, "2xl": 80 };
    const box = sizes[size] || sizes.md;
    const overlap = Math.round(box * 0.28);

    return (
        <span
            className={className}
            style={{
                display: "inline-flex",
                flexDirection: "row-reverse",
                alignItems: "center",
            }}
        >
            {overflow > 0 && (
                <span
                    style={{
                        width: box,
                        height: box,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(142,142,147,0.15)",
                        color: "#636366",
                        fontSize: Math.round(box * 0.29),
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        fontFamily: '-apple-system, "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif',
                        border: "2px solid #fff",
                        boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.07)",
                        boxSizing: "border-box",
                        marginLeft: -overlap,
                        userSelect: "none",
                        flexShrink: 0,
                    }}
                >
                    +{overflow}
                </span>
            )}
            {[...shown].reverse().map((a, i) => (
                <Avatar
                    key={i}
                    {...a}
                    size={size}
                    bordered
                    style={{ marginLeft: i < shown.length - 1 ? -overlap : 0 }}
                />
            ))}
        </span>
    );
};

export default Avatar;