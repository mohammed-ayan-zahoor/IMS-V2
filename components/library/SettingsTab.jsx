'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, AlertCircle, Barcode, ShieldAlert, BookOpen, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

export default function SettingsTab() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        fetch('/api/v1/library/settings')
            .then(r => r.json())
            .then(d => {
                setSettings(d.settings || {});
            })
            .finally(() => setLoading(false));
    }, []);

    const updateField = (field, val) => {
        setIsDirty(true);
        setStatusMessage(null);
        setSettings(s => ({ ...s, [field]: val }));
    };

    const updateLoanRule = (role, key, val) => {
        setIsDirty(true);
        setStatusMessage(null);
        const parsed = parseInt(val, 10);
        setSettings(s => ({
            ...s,
            loanRules: {
                ...s.loanRules,
                [role]: {
                    ...s.loanRules?.[role],
                    [key]: isNaN(parsed) ? '' : Math.max(0, parsed)
                }
            }
        }));
    };

    const updateFineConfig = (key, val) => {
        setIsDirty(true);
        setStatusMessage(null);
        setSettings(s => ({
            ...s,
            fineConfig: {
                ...s.fineConfig,
                [key]: key === 'amount' ? (parseFloat(val) || 0) : key === 'offsetDays' ? (parseInt(val, 10) || 0) : val
            }
        }));
    };

    async function handleSave(e) {
        if (e) e.preventDefault();
        setSaving(true);
        setStatusMessage(null);
        try {
            const res = await fetch('/api/v1/library/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save settings');
            setSettings(data.settings);
            setIsDirty(false);
            setStatusMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-12 justify-center">
                <Loader2 size={16} className="animate-spin" /> Loading library settings…
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 pb-20">
            {/* Header Description */}
            <div>
                <h2 className="text-sm font-bold text-slate-900">Library Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    Configure institutional barcode generation, role-based borrowing limits, overdue fine rates, and hold expiry.
                </p>
            </div>

            {/* Section 1: General & Barcode Settings */}
            <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
                    <Barcode size={15} className="text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        General & Barcode Settings
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={!!settings.barcodeGenerationEnabled}
                            onChange={e => updateField('barcodeGenerationEnabled', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                            <span className="text-xs font-bold text-slate-800">Enable Barcode Generation</span>
                            <p className="text-[11px] text-slate-500">
                                Automatically assign unique sequential Code-128 accession numbers when copies are added.
                            </p>
                        </div>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                        <Input
                            label="Accession Prefix"
                            value={settings.barcodePrefix || 'LIB'}
                            onChange={e => updateField('barcodePrefix', e.target.value.toUpperCase())}
                            maxLength={8}
                            helperText="Prefix for auto-generated barcodes (e.g. LIB-2026-000001)"
                            className="font-mono uppercase font-bold"
                        />

                        <Input
                            label="Hold Expiry (Days)"
                            type="number"
                            min="1"
                            max="30"
                            value={settings.holdExpiryDays ?? 3}
                            onChange={e => updateField('holdExpiryDays', parseInt(e.target.value, 10) || 3)}
                            helperText="Days a reserved book is held before releasing to the next patron"
                        />

                        <Input
                            label="Default Replacement Cost (₹)"
                            type="number"
                            min="0"
                            value={settings.defaultReplacementCost ?? 500}
                            onChange={e => updateField('defaultReplacementCost', parseFloat(e.target.value) || 0)}
                            helperText="Applied when a book is marked lost without a custom cost"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Patron Loan Rules (Comparison Table) */}
            <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen size={15} className="text-slate-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Patron Loan Rules
                        </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Rules applied at desk checkout and renewal</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-5">Rule Description</th>
                                <th className="py-3 px-5 text-center">Students</th>
                                <th className="py-3 px-5 text-center">Instructors</th>
                                <th className="py-3 px-5 text-center">Staff Members</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            <tr>
                                <td className="py-3.5 px-5">
                                    <p className="font-bold text-slate-800">Loan Period</p>
                                    <p className="text-[11px] text-slate-400">Borrowing duration before overdue fines begin</p>
                                </td>
                                {['student', 'instructor', 'staff'].map(role => (
                                    <td key={role} className="py-3 px-5 text-center">
                                        <div className="inline-flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="1"
                                                max="180"
                                                value={settings.loanRules?.[role]?.durationDays ?? ''}
                                                onChange={e => updateLoanRule(role, 'durationDays', e.target.value)}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
                                            />
                                            <span className="text-[11px] text-slate-500">days</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td className="py-3.5 px-5">
                                    <p className="font-bold text-slate-800">Maximum Books</p>
                                    <p className="text-[11px] text-slate-400">Max active simultaneous loans per patron</p>
                                </td>
                                {['student', 'instructor', 'staff'].map(role => (
                                    <td key={role} className="py-3 px-5 text-center">
                                        <div className="inline-flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={settings.loanRules?.[role]?.maxBooks ?? ''}
                                                onChange={e => updateLoanRule(role, 'maxBooks', e.target.value)}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
                                            />
                                            <span className="text-[11px] text-slate-500">books</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            <tr>
                                <td className="py-3.5 px-5">
                                    <p className="font-bold text-slate-800">Renewal Limit</p>
                                    <p className="text-[11px] text-slate-400">Times a book can be extended without check-in</p>
                                </td>
                                {['student', 'instructor', 'staff'].map(role => (
                                    <td key={role} className="py-3 px-5 text-center">
                                        <div className="inline-flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={settings.loanRules?.[role]?.renewalLimit ?? ''}
                                                onChange={e => updateLoanRule(role, 'renewalLimit', e.target.value)}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
                                            />
                                            <span className="text-[11px] text-slate-500">times</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 3: Fine Rules */}
            <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={15} className="text-slate-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Overdue Fine Rules
                        </h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                            type="checkbox"
                            checked={!!settings.fineConfig?.enabled}
                            onChange={e => updateFineConfig('enabled', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span>Enable Overdue Fines</span>
                    </label>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Select
                            label="Calculation Type"
                            value={settings.fineConfig?.type || 'daily'}
                            onChange={val => updateFineConfig('type', val)}
                            options={[
                                { label: 'Per Day Accrual', value: 'daily' },
                                { label: 'Flat Fee per Return', value: 'flat' }
                            ]}
                        />

                        <Input
                            label="Fine Amount (₹)"
                            type="number"
                            min="0"
                            step="0.5"
                            value={settings.fineConfig?.amount ?? 1}
                            onChange={e => updateFineConfig('amount', e.target.value)}
                            helperText={settings.fineConfig?.type === 'flat' ? 'Fixed charge per overdue return' : 'Amount charged per day overdue'}
                        />

                        <Input
                            label="Grace Period (Days)"
                            type="number"
                            min="0"
                            max="30"
                            value={settings.fineConfig?.offsetDays ?? 0}
                            onChange={e => updateFineConfig('offsetDays', e.target.value)}
                            helperText="Days past due date before fines begin accruing"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                    {statusMessage ? (
                        statusMessage.type === 'success' ? (
                            <span className="text-green-600 font-semibold flex items-center gap-1.5">
                                <CheckCircle2 size={14} /> {statusMessage.text}
                            </span>
                        ) : (
                            <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                                <AlertCircle size={14} /> {statusMessage.text}
                            </span>
                        )
                    ) : isDirty ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                            You have unsaved configuration changes
                        </span>
                    ) : (
                        <span className="text-slate-400">
                            Settings are up to date
                        </span>
                    )}
                </div>

                <Button type="submit" loading={saving} size="sm">
                    <Save size={14} /> Save Changes
                </Button>
            </div>
        </form>
    );
}
