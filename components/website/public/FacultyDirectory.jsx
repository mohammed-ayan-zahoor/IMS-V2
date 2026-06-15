"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mail, GraduationCap, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import MediaPicker from '../widgets/MediaPicker';

const FacultyDirectory = ({ content = {}, isEditing = false, onUpdate }) => {
    const [pickerIndex, setPickerIndex] = useState(null);
    const carouselRef = useRef(null);
    const [carouselWidth, setCarouselWidth] = useState(0);

    const {
        title = "Our Expert Faculty",
        subtitle = "Meet the dedicated professionals who shape the future of our students.",
        layout = "grid",
        members = [
            { id: 1, name: "Dr. Sarah Wilson", role: "Principal", dept: "Administration", image: "https://i.pravatar.cc/150?u=sarah" },
            { id: 2, name: "Mr. James Bond", role: "Sr. Teacher", dept: "Mathematics", image: "https://i.pravatar.cc/150?u=james" },
            { id: 3, name: "Ms. Elena Gilbert", role: "Teacher", dept: "Science", image: "https://i.pravatar.cc/150?u=elena" },
            { id: 4, name: "Mr. Damon Salvatore", role: "Coach", dept: "Sports", image: "https://i.pravatar.cc/150?u=damon" }
        ]
    } = content;

    useEffect(() => {
        if (layout === 'carousel' && carouselRef.current) {
            setCarouselWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
        }
    }, [layout, members]);

    const renderLayout = () => {
        switch (layout) {
            case 'cards':
                return (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {members.map((member, index) => (
                            <motion.div 
                                key={member.id} 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="group relative overflow-hidden rounded-[40px] bg-slate-50 border border-slate-100 hover:border-blue-500/30 shadow-lg hover:shadow-2xl transition-all duration-500 p-8 flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                <div className="relative mb-6">
                                    <div className="w-32 h-32 overflow-hidden rounded-full ring-4 ring-slate-100 group-hover:ring-blue-500/20 transition-all duration-500">
                                        <img 
                                            src={member.image} 
                                            alt={member.name}
                                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                        />
                                        {isEditing && (
                                            <div 
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                                                onClick={() => setPickerIndex(index)}
                                            >
                                                <ImageIcon className="text-white" size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-blue-600 border border-slate-50">
                                        <GraduationCap size={20} />
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-900">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                            value={member.name}
                                            onChange={(e) => {
                                                const newMembers = [...members];
                                                newMembers[index].name = e.target.value;
                                                onUpdate({ members: newMembers });
                                            }}
                                        />
                                    ) : member.name}
                                </h3>
                                <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                            value={member.role}
                                            onChange={(e) => {
                                                const newMembers = [...members];
                                                newMembers[index].role = e.target.value;
                                                onUpdate({ members: newMembers });
                                            }}
                                        />
                                    ) : member.role}
                                </p>
                                <div className="mt-3 inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent outline-none w-24 text-center font-bold"
                                            value={member.dept}
                                            onChange={(e) => {
                                                const newMembers = [...members];
                                                newMembers[index].dept = e.target.value;
                                                onUpdate({ members: newMembers });
                                            }}
                                        />
                                    ) : member.dept}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case 'carousel':
                return (
                    <div className="relative w-full overflow-hidden" ref={carouselRef}>
                        <motion.div 
                            drag="x"
                            dragConstraints={{ right: 0, left: -carouselWidth }}
                            whileTap={{ cursor: "grabbing" }}
                            className="flex gap-6 cursor-grab px-4 pb-8"
                        >
                            {members.map((member, index) => (
                                <motion.div 
                                    key={member.id} 
                                    className="w-[280px] shrink-0 group relative overflow-hidden rounded-[30px] bg-slate-50 border border-slate-100 p-6 flex flex-col items-center text-center shadow-md select-none"
                                >
                                    <div className="relative mb-4">
                                        <div className="w-24 h-24 overflow-hidden rounded-full ring-2 ring-slate-200">
                                            <img 
                                                src={member.image} 
                                                alt={member.name}
                                                className="w-full h-full object-cover pointer-events-none"
                                            />
                                            {isEditing && (
                                                <div 
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                                                    onClick={() => setPickerIndex(index)}
                                                >
                                                    <ImageIcon className="text-white" size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                                value={member.name}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].name = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.name}
                                    </h3>
                                    <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full text-center"
                                                value={member.role}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].role = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.role}
                                    </p>
                                    <div className="mt-2 inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent outline-none w-20 text-center font-bold"
                                                value={member.dept}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].dept = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.dept}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                        <div className="flex justify-center gap-2 mt-4 text-xs text-slate-400 font-bold uppercase tracking-wider">
                            ← Drag to view more faculty →
                        </div>
                    </div>
                );

            case 'grid':
            default:
                return (
                    <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
                        {members.map((member, index) => (
                            <div key={member.id} className="group flex flex-col items-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500 rounded-[40px] rotate-6 group-hover:rotate-12 transition-transform duration-500" style={{ backgroundColor: 'var(--color-primary)' }} />
                                    <div className="relative w-48 h-48 overflow-hidden rounded-[40px]">
                                        <img 
                                            src={member.image} 
                                            alt={member.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                        />
                                        {isEditing && (
                                            <div 
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                onClick={() => setPickerIndex(index)}
                                            >
                                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 text-white">
                                                    <ImageIcon size={24} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600">
                                        <GraduationCap size={24} style={{ color: 'var(--color-primary)' }} />
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h3 className="text-xl font-black text-slate-900">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none w-full text-center"
                                                value={member.name}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].name = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.name}
                                    </h3>
                                    <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--color-primary)' }}>
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none w-full text-center"
                                                value={member.role}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].role = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.role}
                                    </p>
                                    <div className="mt-3 inline-flex px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                                        {isEditing ? (
                                            <input 
                                                className="bg-transparent outline-none w-24 text-center"
                                                value={member.dept}
                                                onChange={(e) => {
                                                    const newMembers = [...members];
                                                    newMembers[index].dept = e.target.value;
                                                    onUpdate({ members: newMembers });
                                                }}
                                            />
                                        ) : member.dept}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <section className="py-24 bg-white">
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

            {pickerIndex !== null && (
                <MediaPicker 
                    currentUrl={members[pickerIndex]?.image}
                    onSelect={(url) => {
                        const newMembers = [...members];
                        newMembers[pickerIndex].image = url;
                        onUpdate({ members: newMembers });
                        setPickerIndex(null);
                    }}
                    onClose={() => setPickerIndex(null)}
                />
            )}
        </section>
    );
};

export default FacultyDirectory;
