'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import LibraryEmptyIllustration from './LibraryEmptyIllustration';

function StatCard({ label, value, sub, highlight = false }) {
    return (
        <div className={`border rounded-xl px-5 py-4 ${highlight ? 'bg-slate-50/50 border-slate-200' : 'bg-white border-slate-200/80'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function ReportsTab() {
    const [mostBorrowed, setMostBorrowed] = useState([]);
    const [fines, setFines] = useState(null);
    const [overdue, setOverdue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/v1/library/reports/most-borrowed').then(r => r.json()),
            fetch('/api/v1/library/reports/fine-totals').then(r => r.json()),
            fetch('/api/v1/library/circulation/overdue').then(r => r.json())
        ]).then(([mb, ft, od]) => {
            setMostBorrowed(mb.mostBorrowed || []);
            setFines(ft);
            setOverdue(od.overdue || []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-12 justify-center">
                <Loader2 size={16} className="animate-spin" /> Loading reports…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Fine Summary */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Fine Summary</h3>
                        <p className="text-xs text-slate-500">Collected and pending penalties for late returns and lost books</p>
                    </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                    <span>
                        <strong>Notice on Finance Isolation:</strong> Fines collected here are tracked separately from the Finance Ledger. They do not appear in the Day Book or cash-drawer totals.
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Fined"
                        value={`₹${(fines?.totalFined || 0).toLocaleString('en-IN')}`}
                        sub={`${fines?.count || 0} penalty transactions`}
                    />
                    <StatCard
                        label="Collected"
                        value={`₹${(fines?.totalCollected || 0).toLocaleString('en-IN')}`}
                        sub={`${fines?.paidCount || 0} paid`}
                        highlight
                    />
                    <StatCard
                        label="Pending Dues"
                        value={`₹${(fines?.totalPending || 0).toLocaleString('en-IN')}`}
                        sub={`${(fines?.count || 0) - (fines?.paidCount || 0)} pending`}
                    />
                </div>
            </div>

            {/* 2-Column Responsive Reports Grid: Overdue Loans & Most Borrowed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Overdue Loans */}
                <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                        <div className="flex items-center gap-2">
                            <Clock size={15} className="text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-900">Overdue Loans</h3>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${overdue.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {overdue.length} {overdue.length === 1 ? 'book' : 'books'}
                        </span>
                    </div>

                    <div className="p-4">
                        {overdue.length === 0 ? (
                            <div className="py-10 text-center space-y-1">
                                <p className="text-3xl font-black text-slate-800">0</p>
                                <p className="text-xs text-slate-500 font-medium">All active loans are within their return period.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                {overdue.map(txn => (
                                    <div key={txn._id} className="py-3 px-1 flex items-center justify-between gap-3 text-xs">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-900 truncate">{txn.book?.title || 'Untitled'}</p>
                                            <p className="text-slate-500 text-[11px] mt-0.5">
                                                {txn.patron?.profile?.firstName} {txn.patron?.profile?.lastName}
                                                {txn.patron?.grNumber ? ` (GR: ${txn.patron.grNumber})` : (txn.patron?.enrollmentNumber ? ` (${txn.patron.enrollmentNumber})` : '')} · <span className="font-mono">{txn.bookCopy?.accessionNumber}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                                                Due {new Date(txn.dueDate).toLocaleDateString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Most Borrowed */}
                <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={15} className="text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-900">Most Borrowed Titles</h3>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Ranked by loans</span>
                    </div>

                    <div className="p-4">
                        {mostBorrowed.length === 0 ? (
                            <div className="py-10 text-center space-y-2">
                                <LibraryEmptyIllustration className="w-16 h-16 mx-auto opacity-80" />
                                <p className="text-xs text-slate-500 font-medium">No borrowing records accumulated yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                {mostBorrowed.map((b, i) => (
                                    <div key={b._id} className="py-3 px-1 flex items-center gap-3 text-xs">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="w-8 h-10 bg-slate-100 rounded overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                                            {b.coverUrl ? (
                                                <img src={b.coverUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <BookOpen size={13} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-900 truncate">{b.title}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{b.authors?.join(', ') || 'Unknown author'}</p>
                                        </div>
                                        <span className="shrink-0 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            {b.issueCount} {b.issueCount === 1 ? 'loan' : 'loans'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
