'use client';
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import LibraryEmptyIllustration from './LibraryEmptyIllustration';

const STATUS_STYLES = {
    waiting: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    fulfilled: 'bg-gray-50 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200'
};

export default function HoldsTab() {
    const [holds, setHolds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/library/holds');
            const data = await res.json();
            setHolds(data.holds || []);
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    async function cancel(holdId) {
        setActionId(holdId);
        try {
            await fetch(`/api/v1/library/holds/${holdId}`, { method: 'DELETE' });
            await load();
        } finally { setActionId(null); }
    }

    if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm py-8"><Loader2 size={16} className="animate-spin" /> Loading holds…</div>;

    if (!holds.length) return (
        <div className="text-center py-16 space-y-3 border border-slate-200/80 rounded-xl bg-white">
            <LibraryEmptyIllustration className="w-24 h-24 mx-auto opacity-85" />
            <div>
                <p className="text-sm font-bold text-slate-800">No active holds</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    When patrons place reservation holds on borrowed titles, their position in the queue will show here.
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {holds.map(hold => (
                <div key={hold._id} className={`border rounded-xl px-5 py-4 flex items-start justify-between gap-4 ${STATUS_STYLES[hold.status] || ''}`}>
                    <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-sm truncate">{hold.book?.title}</p>
                        <p className="text-xs">{hold.book?.authors?.join(', ')}</p>
                        <p className="text-xs mt-1">
                            <span className="font-medium">Patron:</span>{' '}
                            {hold.patron?.profile?.firstName} {hold.patron?.profile?.lastName}
                            {hold.patron?.grNumber ? ` (GR: ${hold.patron.grNumber})` : (hold.patron?.enrollmentNumber ? ` (${hold.patron.enrollmentNumber})` : '')}
                        </p>
                        <p className="text-xs">
                            <span className="font-medium">Requested:</span>{' '}
                            {new Date(hold.requestedAt).toLocaleDateString('en-IN')}
                        </p>
                        {hold.status === 'ready' && hold.expiresAt && (
                            <p className="text-xs font-semibold">
                                Ready — expires {new Date(hold.expiresAt).toLocaleDateString('en-IN')}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold capitalize px-2 py-1 rounded-full border">{hold.status}</span>
                        {['waiting', 'ready'].includes(hold.status) && (
                            <button
                                onClick={() => cancel(hold._id)}
                                disabled={actionId === hold._id}
                                className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                                {actionId === hold._id ? <Loader2 size={12} className="animate-spin" /> : 'Cancel'}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
