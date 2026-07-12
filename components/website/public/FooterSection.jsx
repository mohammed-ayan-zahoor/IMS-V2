"use client";

import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Layout, ExternalLink } from 'lucide-react';

const FooterSection = ({ content = {}, isEditing = false, onUpdate, instituteName }) => {
    const {
        about = "Empowering the next generation of leaders through quality education and hands-on training.",
        links = [
            { label: "Home", url: "/" },
            { label: "Admissions", url: "/admissions" },
            { label: "Courses", url: "/courses" },
            { label: "Contact", url: "/contact" }
        ],
        socials = {
            facebook: "#",
            twitter: "#",
            instagram: "#",
            linkedin: "#"
        },
        copyright = `© ${new Date().getFullYear()} All Rights Reserved`,
        address = "123 Education Square, Knowledge City, Metro State",
        email = "contact@school.edu",
        layout = "classic"
    } = content;

    const socialIcons = {
        facebook: Facebook,
        twitter: Twitter,
        instagram: Instagram,
        linkedin: Linkedin
    };

    const renderLayout = () => {
        switch (layout) {
            case 'simple':
                return (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--color-primary)' }}>
                                <Layout size={20} />
                            </div>
                            <span className="text-lg font-black tracking-tighter uppercase italic truncate max-w-[200px]" title={instituteName || "CampusPro"}>
                                {instituteName || "CampusPro"}
                            </span>
                        </div>

                        <p className="text-slate-400 text-xs">
                            {isEditing ? (
                                <input 
                                    className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-64 text-center md:text-left"
                                    value={copyright}
                                    onChange={(e) => onUpdate({ copyright: e.target.value })}
                                />
                            ) : copyright}
                        </p>

                        <div className="flex gap-4">
                            {Object.entries(socials).map(([platform, url]) => {
                                const Icon = socialIcons[platform];
                                return (
                                    <a 
                                        key={platform} 
                                        href={url} 
                                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all border border-white/5"
                                        style={{ '--tw-hover-bg': 'var(--color-primary)' }}
                                    >
                                        <Icon size={16} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'classic':
            default:
                return (
                    <>
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 md:grid-cols-2 mb-20">
                            {/* Brand & About */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20" style={{ backgroundColor: 'var(--color-primary)' }}>
                                        <Layout size={24} />
                                    </div>
                                    <span className="text-xl font-black tracking-tighter uppercase italic truncate max-w-[200px]" title={instituteName || "CampusPro"}>
                                        {instituteName || "CampusPro"}
                                    </span>
                                </div>
                                <div className="text-slate-400 text-sm leading-relaxed">
                                    {isEditing ? (
                                        <textarea 
                                            className="bg-transparent border border-white/10 rounded p-3 w-full h-24 focus:border-white outline-none"
                                            value={about}
                                            onChange={(e) => onUpdate({ about: e.target.value })}
                                        />
                                    ) : about}
                                </div>
                                <div className="flex gap-4">
                                    {Object.entries(socials).map(([platform, url]) => {
                                        const Icon = socialIcons[platform];
                                        return (
                                            <a 
                                                key={platform} 
                                                href={url} 
                                                className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all border border-white/5"
                                                style={{ '--tw-hover-bg': 'var(--color-primary)' }}
                                            >
                                                <Icon size={20} />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 className="text-lg font-bold mb-8 flex items-center gap-2">
                                    Quick Links
                                    <div className="h-1 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                                </h4>
                                <ul className="space-y-4">
                                    {links.map((link, i) => (
                                        <li key={i} className="group">
                                            <a href={link.url} className="text-slate-400 text-sm hover:text-white transition-colors flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-600 transition-colors" style={{ '--tw-group-hover-bg': 'var(--color-primary)' }} />
                                                {isEditing ? (
                                                    <input 
                                                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-24"
                                                        value={link.label}
                                                        onChange={(e) => {
                                                            const newLinks = [...links];
                                                            newLinks[i].label = e.target.value;
                                                            onUpdate({ links: newLinks });
                                                        }}
                                                    />
                                                ) : link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Contact Info (In Footer) */}
                            <div>
                                <h4 className="text-lg font-bold mb-8 flex items-center gap-2">
                                    Contact Us
                                    <div className="h-1 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                                </h4>
                                <ul className="space-y-6 text-slate-400 text-sm">
                                    <li className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                            <MapPin size={18} className="text-blue-500" style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <textarea
                                                    className="bg-transparent border border-white/10 rounded p-1 w-full h-16 text-xs focus:border-white outline-none"
                                                    value={address}
                                                    onChange={(e) => onUpdate({ address: e.target.value })}
                                                />
                                            ) : address}
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                            <Mail size={18} className="text-blue-500" style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input
                                                    className="bg-transparent border border-white/10 rounded p-1 w-full text-xs focus:border-white outline-none"
                                                    value={email}
                                                    onChange={(e) => onUpdate({ email: e.target.value })}
                                                />
                                            ) : email}
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Certifications/Trust */}
                            <div>
                                <h4 className="text-lg font-bold mb-8 flex items-center gap-2">
                                    Affiliation
                                    <div className="h-1 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                                </h4>
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)20' }}>
                                            <ExternalLink size={14} className="text-blue-500" style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Board Certified</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight">
                                        Fully accredited by the National Board of Secondary Education and Vocational Training.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-white/5 mb-12" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            <p>
                                {isEditing ? (
                                    <input 
                                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-64 text-center md:text-left"
                                        value={copyright}
                                        onChange={(e) => onUpdate({ copyright: e.target.value })}
                                    />
                                ) : copyright}
                            </p>
                            <div className="flex gap-8">
                                <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                                <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <footer className="bg-slate-900 text-white pt-16 pb-12 rounded-t-[60px] mt-12">
            <div className="container px-6 mx-auto">
                {renderLayout()}
            </div>
        </footer>
    );
};

export default FooterSection;
