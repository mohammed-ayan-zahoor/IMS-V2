"use client";

import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Layout } from 'lucide-react';

const WebsiteFooter = ({ config = {} }) => {
    const {
        branding = {},
        settings = {}
    } = config;

    return (
        <footer className="bg-slate-900 text-white pt-24 pb-12">
            <div className="container px-6 mx-auto">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 md:grid-cols-2 mb-20">
                    {/* Brand */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                <Layout size={20} />
                            </div>
                            <span className="text-xl font-black tracking-tighter">
                                {config.instituteName || "SCHOOL PORTAL"}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {settings.seoDescription || "Empowering the next generation with quality education and hands-on professional training."}
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold mb-6">Quick Links</h4>
                        <ul className="space-y-4 text-slate-400 text-sm">
                            {['About Us', 'Academic Programs', 'Admissions', 'Faculty', 'News & Events'].map(link => (
                                <li key={link} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                    {link}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* School Type Specific */}
                    <div>
                        <h4 className="text-lg font-bold mb-6">
                            {config.template === 'VOCATIONAL' ? 'Job Placement' : 'Student Life'}
                        </h4>
                        <ul className="space-y-4 text-slate-400 text-sm">
                            {config.template === 'VOCATIONAL' 
                                ? ['Partner Companies', 'Success Stories', 'Placement Cell', 'Skill Workshops', 'Alumni Network']
                                : ['Sports & Games', 'Library', 'Hostel Life', 'Campus Tour', 'Extracurricular']
                            .map(link => (
                                <li key={link} className="hover:text-white transition-colors cursor-pointer">
                                    {link}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="text-lg font-bold mb-6">Stay Updated</h4>
                        <p className="text-slate-400 text-sm mb-4">Subscribe to our newsletter for latest updates and news.</p>
                        <form className="relative">
                            <input 
                                placeholder="Your Email"
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                            <button className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                                Join
                            </button>
                        </form>
                    </div>
                </div>

                <hr className="border-white/5 mb-12" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs font-bold uppercase tracking-widest">
                    <p>© 2024 {config.instituteName}. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default WebsiteFooter;
