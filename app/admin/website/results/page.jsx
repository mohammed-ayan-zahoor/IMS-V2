'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff, Save, ExternalLink, Calendar, Award, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WebsiteResultsAdminPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [exams, setExams] = useState([]);
    const [hiddenExams, setHiddenExams] = useState([]);
    const [customTitle, setCustomTitle] = useState('');
    const [customSubtitle, setCustomSubtitle] = useState('');

    const instituteCode = session?.user?.institute?.code || '';

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/website/results-config');
            const data = await res.json();
            if (res.ok && data.success) {
                setActiveSession(data.activeSession);
                setExams(data.exams || []);
                setHiddenExams((data.config?.hiddenExams || []).map(String));
                setCustomTitle(data.config?.customTitle || 'Student Examination Results');
                setCustomSubtitle(data.config?.customSubtitle || 'Enter your Enrollment Number and Date of Birth to view your statement of marks.');
            } else {
                toast.error(data.error || 'Failed to load results configuration');
            }
        } catch (err) {
            toast.error('Network error loading configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const toggleExamVisibility = (examId) => {
        const idStr = String(examId);
        setHiddenExams(prev => 
            prev.includes(idStr) 
                ? prev.filter(id => id !== idStr) 
                : [...prev, idStr]
        );
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/v1/website/results-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hiddenExams,
                    customTitle,
                    customSubtitle
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Results portal settings saved successfully!');
            } else {
                toast.error(data.error || 'Failed to save settings');
            }
        } catch (err) {
            toast.error('Network error while saving settings');
        } finally {
            setSaving(false);
        }
    };

    const livePortalUrl = instituteCode ? `/website/${instituteCode}/results` : '/website';

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Award className="w-7 h-7 text-blue-600" />
                        Website Results Portal
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control which offline examinations appear on your public student result verification page.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <a
                        href={livePortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Live Portal
                    </a>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm font-medium">Loading portal configuration...</p>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Active Academic Session Info Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">Active Academic Session</span>
                                <span className="text-base font-bold text-slate-900">
                                    {activeSession ? `Session ${activeSession.name}` : 'No active session set'}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-600 hidden sm:block">
                            Students will automatically see published results for this session.
                        </div>
                    </div>

                    {/* Page Customization Header Settings */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Portal Banner Settings</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Portal Header Title
                                </label>
                                <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder="Student Examination Results"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Subtitle Instructions
                                </label>
                                <input
                                    type="text"
                                    value={customSubtitle}
                                    onChange={(e) => setCustomSubtitle(e.target.value)}
                                    placeholder="Enter your Enrollment Number and Date of Birth..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Examination Visibility List */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Published Offline Examinations</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Toggle eye icons to show or hide specific exams from the public student result portal.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {exams.length} Published Exams
                            </span>
                        </div>

                        {exams.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Award className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">No Published Offline Exams in this Session</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                    Create and publish offline exams in the Offline Exams module to make their statement of marks available here.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                {exams.map((exam) => {
                                    const isHidden = hiddenExams.includes(String(exam.id));
                                    return (
                                        <div
                                            key={exam.id}
                                            className={`p-4 flex items-center justify-between gap-4 transition ${isHidden ? 'bg-slate-50/80 opacity-70' : 'bg-white hover:bg-slate-50/50'}`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">{exam.title}</span>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                                        {exam.examType}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <span>Course: <strong className="text-slate-700">{exam.courseName}</strong></span>
                                                    <span>•</span>
                                                    <span>{exam.subjectsCount} Subjects</span>
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExamVisibility(exam.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                        isHidden
                                                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                                    }`}
                                                >
                                                    {isHidden ? (
                                                        <>
                                                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                                            Hidden from Portal
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                                            Visible on Portal
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={fetchConfig}
                            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-60 cursor-pointer"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
