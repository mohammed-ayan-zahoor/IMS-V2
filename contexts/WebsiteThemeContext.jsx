"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const WebsiteThemeContext = createContext();

export const PRESET_THEMES = {
    default: {
        primary: '#0066ff',
        secondary: '#00a86b',
        accent: '#ff7a3d',
        light: '#f7f8fa',
        dark: '#111827'
    },
    ocean: {
        primary: '#006994',
        secondary: '#0099cc',
        accent: '#00d4ff',
        light: '#e8f4f8',
        dark: '#0a1929'
    },
    forest: {
        primary: '#2d5016',
        secondary: '#5a8c2f',
        accent: '#8bc34a',
        light: '#f1f8e9',
        dark: '#1b3a0f'
    },
    sunset: {
        primary: '#ff6b35',
        secondary: '#f7931e',
        accent: '#ffd700',
        light: '#fff8e1',
        dark: '#4a2c0f'
    },
    royal: {
        primary: '#4a148c',
        secondary: '#7b1fa2',
        accent: '#ba68c8',
        light: '#f3e5f5',
        dark: '#1a0033'
    }
};

export function WebsiteThemeProvider({ children, initialTheme = 'default' }) {
    const [theme, setTheme] = useState(initialTheme);
    const [customColors, setCustomColors] = useState(PRESET_THEMES[initialTheme] || PRESET_THEMES.default);

    useEffect(() => {
        // Apply theme to CSS variables
        const root = document.documentElement;
        root.style.setProperty('--website-color-primary', customColors.primary);
        root.style.setProperty('--website-color-secondary', customColors.secondary);
        root.style.setProperty('--website-color-accent', customColors.accent);
        root.style.setProperty('--website-color-light', customColors.light);
        root.style.setProperty('--website-color-dark', customColors.dark);
    }, [customColors]);

    const updateTheme = (themeName) => {
        if (PRESET_THEMES[themeName]) {
            setTheme(themeName);
            setCustomColors(PRESET_THEMES[themeName]);
        }
    };

    const updateCustomColors = (colors) => {
        setCustomColors(prev => ({ ...prev, ...colors }));
        setTheme('custom');
    };

    return (
        <WebsiteThemeContext.Provider value={{
            theme,
            colors: customColors,
            updateTheme,
            updateCustomColors,
            availableThemes: Object.keys(PRESET_THEMES)
        }}>
            {children}
        </WebsiteThemeContext.Provider>
    );
}

export function useWebsiteTheme() {
    const context = useContext(WebsiteThemeContext);
    if (!context) {
        throw new Error('useWebsiteTheme must be used within WebsiteThemeProvider');
    }
    return context;
}
