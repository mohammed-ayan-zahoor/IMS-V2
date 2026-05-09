"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { useToast } from "@/contexts/ToastContext";

const ContactSection = ({ content = {}, isEditing = false, onUpdate, instituteCode }) => {
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    const {
        title = "Contact Us",
        subtitle = "Have questions? We're here to help. Reach out to us anytime.",
        email = "info@institute.com",
        phone = "+91 98765 43210",
        address = "123 Education Square, Knowledge City",
        showForm = true
    } = content;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isEditing) return;

        const formData = new FormData(e.target);
        
        // Honeypot Spam Protection
        if (formData.get('website_honeypot')) {
            console.log("Spam detected");
            return;
        }

        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            phone: phone, // Default phone or we could add it to form
            instituteCode
        };

        setSubmitting(true);
        try {
            const res = await fetch('/api/v1/website/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                toast.success("Message sent successfully!");
                e.target.reset();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to send message");
            }
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="py-24 bg-white">
            <div className="container px-6 mx-auto">
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
                    {/* Contact Info */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-4xl font-extrabold text-slate-900">
                                {isEditing ? (
                                    <input 
                                        className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full"
                                        value={title}
                                        onChange={(e) => onUpdate({ title: e.target.value })}
                                    />
                                ) : title}
                            </h2>
                            <p className="mt-4 text-xl text-slate-500">
                                {isEditing ? (
                                    <textarea 
                                        className="bg-transparent border border-slate-100 rounded p-2 w-full h-24 focus:border-blue-500 outline-none"
                                        value={subtitle}
                                        onChange={(e) => onUpdate({ subtitle: e.target.value })}
                                    />
                                ) : subtitle}
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Email Us</p>
                                    <p className="text-lg font-bold text-slate-700 mt-1">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none w-full"
                                                value={email}
                                                onChange={(e) => onUpdate({ email: e.target.value })}
                                            />
                                        ) : email}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Call Us</p>
                                    <p className="text-lg font-bold text-slate-700 mt-1">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none w-full"
                                                value={phone}
                                                onChange={(e) => onUpdate({ phone: e.target.value })}
                                            />
                                        ) : phone}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Our Campus</p>
                                    <p className="text-lg font-bold text-slate-700 mt-1">
                                        {isEditing ? (
                                            <textarea 
                                                className="bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none w-full"
                                                value={address}
                                                onChange={(e) => onUpdate({ address: e.target.value })}
                                            />
                                        ) : address}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    {showForm && (
                        <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            
                            <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                                {/* Honeypot field */}
                                <input type="text" name="website_honeypot" className="hidden" tabIndex="-1" autoComplete="off" />
                                
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600">Full Name</label>
                                        <input 
                                            required
                                            name="name"
                                            disabled={isEditing}
                                            placeholder="John Doe"
                                            className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600">Email Address</label>
                                        <input 
                                            required
                                            type="email"
                                            name="email"
                                            disabled={isEditing}
                                            placeholder="john@example.com"
                                            className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">Subject</label>
                                    <select 
                                        name="subject"
                                        disabled={isEditing}
                                        className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                                    >
                                        <option>Admission Inquiry</option>
                                        <option>Course Details</option>
                                        <option>Technical Support</option>
                                        <option>Others</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">Message</label>
                                    <textarea 
                                        required
                                        name="message"
                                        disabled={isEditing}
                                        rows={4}
                                        placeholder="How can we help you?"
                                        className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50 resize-none"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={submitting || isEditing}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    {submitting ? "Sending..." : "Send Message"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
