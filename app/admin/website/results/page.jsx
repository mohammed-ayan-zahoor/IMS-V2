'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff, Save, ExternalLink, Calendar, Award, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

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
                setCustomSubtitle(data.config?.customSubtitle || 'Enter your Enrollment Number and Date of Birth to view your exam results.');
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
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Award className="w-6 h-6 text-slate-800" />
                        Website Results Portal
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Control which offline examinations appear on your public student result verification page.
                    </p>
                </div>

                <a
                    href={livePortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview Live Portal
                </a>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Active Academic Session Info Card */}
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Active Academic Session</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {activeSession ? `Session ${activeSession.name}` : 'No active session set'}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium hidden sm:block">
                            Students will automatically see published results for this session.
                        </div>
                    </div>

                    {/* Consolidated Settings Card */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-6">
                        {/* Section 1: Banner Text Settings */}
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Portal Banner Settings</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Portal Header Title
                                    </label>
                                    <input
                                        type="text"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder="Student Examination Results"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium outline-none focus:border-slate-400 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Subtitle Instructions
                                    </label>
                                    <input
                                        type="text"
                                        value={customSubtitle}
                                        onChange={(e) => setCustomSubtitle(e.target.value)}
                                        placeholder="Enter your Enrollment Number and Date of Birth to view your exam results."
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium outline-none focus:border-slate-400 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Section 2: Examination Visibility List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Published Offline Examinations</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Toggle eye icons to show or hide specific exams from the public student result portal.
                                    </p>
                                </div>
                                <span className={cn(
                                    "text-xs font-semibold px-2.5 py-1 rounded-lg border",
                                    exams.length === 0 ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60" : "bg-slate-100 text-slate-700 border-slate-200"
                                )}>
                                    {exams.length} Published Exams
                                </span>
                            </div>

                            {exams.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <Award className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm font-bold text-slate-800">No Published Offline Exams in this Session</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        Create and publish offline exams in the Offline Exams module to make their statement of marks available here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                                    {exams.map((exam) => {
                                        const isHidden = hiddenExams.includes(String(exam.id));
                                        return (
                                            <div
                                                key={exam.id}
                                                className={`p-4 flex items-center justify-between gap-4 transition ${isHidden ? 'bg-slate-50/80 opacity-70' : 'bg-white hover:bg-slate-50/50'}`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900">{exam.title}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                                                            {exam.examType}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span>Course: <strong className="text-slate-700">{exam.courseName}</strong></span>
                                                        <span>•</span>
                                                        <span>{exam.subjectsCount} Subjects</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExamVisibility(exam.id)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border",
                                                            isHidden
                                                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                        )}
                                                    >
                                                        {isHidden ? (
                                                            <>
                                                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                                                Hidden from Portal
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={fetchConfig}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5"
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
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
