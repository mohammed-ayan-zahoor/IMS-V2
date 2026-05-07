"use client";
import React from "react";

const Avatar = ({ name, src, size = "md", className = "" }) => {
    const sizeClasses = {
        xs: "w-6 h-6 text-[10px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
        xl: "w-16 h-16 text-xl",
        "2xl": "w-20 h-20 text-2xl"
    };

    const getInitials = (name) => {
        if (!name) return "";
        const parts = name.split(" ");
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    const bgColors = [
        "bg-blue-100 text-blue-600",
        "bg-emerald-100 text-emerald-600",
        "bg-violet-100 text-violet-600",
        "bg-amber-100 text-amber-600",
        "bg-rose-100 text-rose-600",
        "bg-cyan-100 text-cyan-600",
    ];

    const colorIndex = name ? name.length % bgColors.length : 0;
    const colorClass = bgColors[colorIndex];

    return (
        <div className={`relative flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-white shadow-sm ${sizeClasses[size]} ${colorClass} ${className}`}>
            {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="font-black tracking-tight">{getInitials(name)}</span>
            )}
        </div>
    );
};

export default Avatar;
