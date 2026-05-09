"use client";

import React, { useState } from 'react';
import { Mail, GraduationCap, Image as ImageIcon } from 'lucide-react';
import MediaPicker from '../widgets/MediaPicker';

const FacultyDirectory = ({ content = {}, isEditing = false, onUpdate }) => {
    const [pickerIndex, setPickerIndex] = useState(null);
    const {
        title = "Our Expert Faculty",
        subtitle = "Meet the dedicated professionals who shape the future of our students.",
        members = [
            { id: 1, name: "Dr. Sarah Wilson", role: "Principal", dept: "Administration", image: "https://i.pravatar.cc/150?u=sarah" },
            { id: 2, name: "Mr. James Bond", role: "Sr. Teacher", dept: "Mathematics", image: "https://i.pravatar.cc/150?u=james" },
            { id: 3, name: "Ms. Elena Gilbert", role: "Teacher", dept: "Science", image: "https://i.pravatar.cc/150?u=elena" },
            { id: 4, name: "Mr. Damon Salvatore", role: "Coach", dept: "Sports", image: "https://i.pravatar.cc/150?u=damon" }
        ]
    } = content;

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

                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
                    {members.map((member, index) => (
                        <div key={member.id} className="group flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-500 rounded-[40px] rotate-6 group-hover:rotate-12 transition-transform duration-500" />
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
                                    <GraduationCap size={24} />
                                </div>
                            </div>

                            {pickerIndex === index && (
                                <MediaPicker 
                                    currentUrl={member.image}
                                    onSelect={(url) => {
                                        const newMembers = [...members];
                                        newMembers[index].image = url;
                                        onUpdate({ members: newMembers });
                                        setPickerIndex(null);
                                    }}
                                    onClose={() => setPickerIndex(null)}
                                />
                            )}

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
                                <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">
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
            </div>
        </section>
    );
};

export default FacultyDirectory;
