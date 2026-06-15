"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, Globe, Layout } from 'lucide-react';
import { cn } from "@/lib/utils";

const WebsiteHeader = ({ config = {}, pages = [], instituteCode = '', isDark = false }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const {
        branding = {},
        settings = {}
    } = config;

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Build navigation links dynamically if pages exist
    const navLinks = pages && pages.length > 0
        ? pages.map((p) => ({
            name: p.title,
            href: p.slug === 'index' 
                ? `/website/${instituteCode}` 
                : `/website/${instituteCode}/${p.slug}`
          }))
        : [
            { name: 'Home', href: '#' },
            { name: 'Programs', href: '#programs' },
            { name: 'Faculty', href: '#faculty' },
            { name: 'Gallery', href: '#gallery' },
            { name: 'Contact', href: '#contact' }
          ];

    return (
        <header className={cn(
            "sticky top-0 left-0 w-full z-[100] transition-all duration-500",
            (isScrolled || isMobileMenuOpen || !isDark) 
                ? "bg-white/90 backdrop-blur-xl shadow-xl py-4" 
                : "bg-transparent py-6"
        )}>
            <div className="container px-6 mx-auto flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        {config.instituteLogo || branding.logo ? (
                            <img 
                                src={config.instituteLogo || branding.logo} 
                                alt="Logo" 
                                className="w-full h-full object-contain p-2" 
                            />
                        ) : (
                            <Layout size={24} />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-xl font-black tracking-tighter leading-none transition-colors",
                            (isScrolled || isMobileMenuOpen) ? "text-slate-900" : (isDark ? "text-white" : "text-slate-900")
                        )}>
                            {config.instituteName || "SCHOOL PORTAL"}
                        </span>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest mt-1",
                            (isScrolled || isMobileMenuOpen) ? "text-slate-400" : (isDark ? "text-white/60" : "text-slate-500")
                        )}>
                            {config.template} Institute
                        </span>
                    </div>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a 
                            key={link.name} 
                            href={link.href}
                            className={cn(
                                "text-sm font-bold transition-all hover:scale-105 active:scale-95",
                                isScrolled ? "text-slate-600 hover:text-blue-600" : (isDark ? "text-white/90 hover:text-white" : "text-slate-600 hover:text-blue-600")
                            )}
                        >
                            {link.name}
                        </a>
                    ))}
                    <button className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:scale-105 transition-all">
                        Student Portal
                    </button>
                </nav>

                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={cn(
                        "md:hidden p-2 rounded-xl transition-colors",
                        (isScrolled || isMobileMenuOpen) ? "text-slate-900 bg-slate-100" : (isDark ? "text-white bg-white/10" : "text-slate-900 bg-slate-100")
                    )}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                    <nav className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <a 
                                key={link.name} 
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-lg font-bold text-slate-700 hover:text-blue-600 p-2"
                            >
                                {link.name}
                            </a>
                        ))}
                        <hr className="border-slate-100" />
                        <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">
                            Student Login
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default WebsiteHeader;
