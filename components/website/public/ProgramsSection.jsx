"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, GraduationCap } from 'lucide-react';

const ProgramsSection = ({ content = {}, isEditing = false, onUpdate, instituteId }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const {
        title = "Our Educational Programs",
        subtitle = "We offer a wide range of courses designed to meet global standards.",
        showCategories = true
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

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {displayCourses.map((course) => (
                        <div key={course._id} className="group p-8 bg-slate-50 rounded-[40px] border border-slate-100 hover:bg-premium-blue hover:text-white transition-all duration-500">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                <BookOpen size={28} />
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
            </div>
        </section>
    );
};

export default ProgramsSection;
