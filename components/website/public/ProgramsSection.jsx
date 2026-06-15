"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, GraduationCap, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const ProgramsSection = ({ content = {}, isEditing = false, onUpdate, instituteId }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const {
        title = "Our Educational Programs",
        subtitle = "We offer a wide range of courses designed to meet global standards.",
        layout = "grid"
    } = content;

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch(`/api/v1/website/courses?instituteId=${instituteId}`);
                const data = await res.json();
                if (res.ok) setCourses(data.courses || []);
            } catch (error) {
                console.error("Failed to fetch courses");
            } finally {
                setLoading(false);
            }
        };

        if (instituteId) fetchCourses();
    }, [instituteId]);

    // Fallback if no courses found
    const displayCourses = courses.length > 0 ? courses : [
        { _id: '1', name: 'Software Engineering', duration: '2 Years', description: 'Advanced full-stack development and architecture.' },
        { _id: '2', name: 'Business Management', duration: '3 Years', description: 'Master the art of modern business and leadership.' },
        { _id: '3', name: 'Digital Marketing', duration: '6 Months', description: 'Hands-on training in SEO, SEM, and social media.' }
    ];

    const renderLayout = () => {
        switch (layout) {
            case 'cards':
                return (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {displayCourses.map((course, index) => (
                            <motion.div 
                                key={course._id} 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="group relative overflow-hidden rounded-[40px] bg-slate-50 border border-slate-200/50 hover:bg-slate-900 hover:text-white transition-all duration-500 p-8 flex flex-col justify-between shadow-lg hover:shadow-xl"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                                <div>
                                    <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <BookOpen size={28} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4 group-hover:text-white text-slate-900 transition-colors">{course.name}</h3>
                                    <p className="text-slate-500 group-hover:text-slate-350 leading-relaxed mb-6">
                                        {course.description}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 group-hover:border-white/10">
                                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-blue-400 text-blue-600 transition-colors">
                                        <GraduationCap size={16} />
                                        {course.duration || 'Flexible'}
                                    </span>
                                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform text-blue-600 group-hover:text-blue-400" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case 'list':
                return (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {displayCourses.map((course, index) => (
                            <motion.div 
                                key={course._id} 
                                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="group flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-slate-50 border border-slate-100 rounded-[30px] hover:bg-white hover:shadow-xl hover:border-blue-500/20 transition-all duration-300"
                            >
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                                        <BookOpen size={22} style={{ color: 'var(--color-primary)' }} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{course.name}</h3>
                                        <p className="text-slate-500 text-sm mt-1 leading-relaxed max-w-xl">
                                            {course.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-250/50 justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-3.5 py-2 rounded-xl flex items-center gap-2">
                                        <Calendar size={14} />
                                        {course.duration || 'Flexible'}
                                    </span>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case 'grid':
            default:
                return (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {displayCourses.map((course) => (
                            <div key={course._id} className="group p-8 bg-slate-50 rounded-[40px] border border-slate-100 hover:bg-premium-blue hover:text-white transition-all duration-500" style={{ '--tw-hover-bg': 'var(--color-primary)' }}>
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                    <BookOpen size={28} style={{ color: 'var(--color-primary)' }} />
                                </div>
                                <h3 className="text-2xl font-black mb-4">{course.name}</h3>
                                <p className="text-slate-500 group-hover:text-white/80 leading-relaxed mb-6">
                                    {course.description}
                                </p>
                                <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-200 group-hover:border-white/20">
                                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <GraduationCap size={16} />
                                        {course.duration || 'Flexible'}
                                    </span>
                                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <section className="py-24 bg-white" id="programs">
            <div className="container px-6 mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <h2 className="text-4xl font-extrabold text-slate-900">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h2>
                    <p className="mt-6 text-xl text-slate-500">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-slate-100 rounded p-3 w-full h-24 focus:border-blue-500 outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>
                </div>

                {renderLayout()}
            </div>
        </section>
    );
};

export default ProgramsSection;
