"use client";

import { AlertTriangle, HelpCircle, X } from "lucide-react";

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, type = "danger" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-desc"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-premium-blue'}`}>
                            {type === 'danger' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
                        </div>
                        <div className="flex-1">
                            <h3 id="confirm-title" className="text-lg font-bold text-slate-900 mb-2">
                                {title || "Please Confirm"}
                            </h3>
                            <p id="confirm-desc" className="text-slate-500 text-sm leading-relaxed">
                                {message || "Are you sure you want to proceed with this action?"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-xl text-sm font-bold shadow-lg transition-colors
                ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                : 'bg-premium-blue hover:bg-premium-blue/90 shadow-premium-blue/20'
                            }`}
                        autoFocus
                    >
                        {type === 'danger' ? 'Confirm Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
