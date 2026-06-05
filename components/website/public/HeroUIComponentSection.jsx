"use client";

import React, { useState } from 'react';
import { HeroUIProvider, Button, Card, CardBody, Input, Textarea } from '@heroui/react';
import { Trash2, Copy, Plus } from 'lucide-react';

const HeroUIComponentSection = ({ content = {}, isEditing = false, onUpdate }) => {
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [showComponentPicker, setShowComponentPicker] = useState(false);

    const {
        title = "Custom Component Section",
        componentType = "button", // button, card, input, textarea, grid, etc
        componentProps = {},
        componentContent = "Click to customize"
    } = content;

    const AVAILABLE_COMPONENTS = {
        button: {
            name: 'Button',
            description: 'Interactive button component',
            preview: () => <Button color="primary">{componentContent}</Button>
        },
        card: {
            name: 'Card',
            description: 'Content card container',
            preview: () => (
                <Card className="w-full">
                    <CardBody>
                        {componentContent}
                    </CardBody>
                </Card>
            )
        },
        input: {
            name: 'Input',
            description: 'Text input field',
            preview: () => <Input placeholder={componentContent} />
        },
        textarea: {
            name: 'Textarea',
            description: 'Text area field',
            preview: () => <Textarea placeholder={componentContent} />
        }
    };

    const renderEditorUI = () => {
        if (!isEditing) return null;

        return (
            <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 p-4 shadow-lg space-y-3 max-w-xs">
                <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Section Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Component Type</label>
                    <select
                        value={componentType}
                        onChange={(e) => onUpdate({ componentType: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-500"
                    >
                        {Object.entries(AVAILABLE_COMPONENTS).map(([key, comp]) => (
                            <option key={key} value={key}>{comp.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Component Content</label>
                    <textarea
                        value={componentContent}
                        onChange={(e) => onUpdate({ componentContent: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 h-16"
                    />
                </div>
            </div>
        );
    };

    const renderComponentPreview = () => {
        const component = AVAILABLE_COMPONENTS[componentType];
        if (!component) return null;

        return (
            <div className="p-12 bg-slate-50 rounded-lg flex items-center justify-center min-h-[300px]">
                <div onClick={() => isEditing && setShowComponentPicker(true)} className="cursor-pointer hover:opacity-80 transition-opacity">
                    {component.preview()}
                </div>
            </div>
        );
    };

    return (
        <section className={`relative py-24 ${isEditing ? 'border-2 border-dashed border-blue-400' : ''} rounded-lg overflow-hidden`}>
            {renderEditorUI()}
            
            <div className="container px-6 mx-auto">
                <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">{title}</h2>
                <p className="text-center text-slate-600 text-sm mb-8">
                    {isEditing && (
                        <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                            Editing Mode: {AVAILABLE_COMPONENTS[componentType]?.name || 'Unknown'}
                        </span>
                    )}
                </p>
                {renderComponentPreview()}
            </div>
        </section>
    );
};

export default HeroUIComponentSection;
