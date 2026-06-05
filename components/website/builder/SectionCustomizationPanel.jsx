"use client";

import React, { useState } from 'react';
import { Palette, Type, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { PRESET_THEMES } from '@/contexts/WebsiteThemeContext';

export const SectionCustomizationPanel = ({ 
    content, 
    onUpdate, 
    availableFields = [],
    presets = []
}) => {
    const [expandedField, setExpandedField] = useState(null);

    const FIELD_TYPES = {
        text: {
            icon: Type,
            render: (field, value) => (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                    placeholder={field.placeholder}
                />
            )
        },
        textarea: {
            icon: Type,
            render: (field, value) => (
                <textarea
                    value={value || ''}
                    onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm h-24"
                    placeholder={field.placeholder}
                />
            )
        },
        color: {
            icon: Palette,
            render: (field, value) => (
                <input
                    type="color"
                    value={value || '#0066ff'}
                    onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                    className="w-full h-10 cursor-pointer rounded-lg border border-slate-200"
                />
            )
        },
        image: {
            icon: ImageIcon,
            render: (field, value) => (
                <div className="relative">
                    <input
                        type="url"
                        value={value || ''}
                        onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                        placeholder="Image URL"
                    />
                    {value && (
                        <img 
                            src={value} 
                            alt="Preview" 
                            className="mt-2 w-full h-32 object-cover rounded-lg"
                        />
                    )}
                </div>
            )
        },
        select: {
            icon: Eye,
            render: (field, value) => (
                <select
                    value={value || ''}
                    onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                >
                    <option value="">Select {field.label}</option>
                    {(field.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Palette size={18} className="text-blue-600" />
                    Customize Section
                </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {availableFields.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">
                        No customization fields available for this section.
                    </p>
                ) : (
                    availableFields.map(field => {
                        const FieldIcon = FIELD_TYPES[field.type]?.icon || Type;
                        const value = content[field.key];
                        const isExpanded = expandedField === field.key;

                        return (
                            <div key={field.key} className="space-y-2 pb-4 border-b border-slate-100 last:border-b-0">
                                <button
                                    onClick={() => setExpandedField(isExpanded ? null : field.key)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center gap-2 text-left">
                                        <FieldIcon size={16} className="text-slate-600 group-hover:text-blue-600" />
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900">{field.label}</p>
                                            {field.help && <p className="text-xs text-slate-500">{field.help}</p>}
                                        </div>
                                    </div>
                                    <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="pl-11 pt-2">
                                        {FIELD_TYPES[field.type]?.render(field, value)}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Presets */}
            {presets.length > 0 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Quick Presets</p>
                    <div className="grid grid-cols-2 gap-2">
                        {presets.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => onUpdate(preset.config)}
                                className="px-3 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 transition-all"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionCustomizationPanel;
