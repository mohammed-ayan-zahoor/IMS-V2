'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, BookOpen, RefreshCw, Loader2, Printer, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AddBookModal, AddCopyModal, EditBookModal } from './BookModals';
import BarcodeSheet from './BarcodeSheet';
import Modal from '@/components/ui/Modal';
import LibraryEmptyIllustration from './LibraryEmptyIllustration';

const CONDITION_COLORS = { good: 'text-green-600', fair: 'text-yellow-600', poor: 'text-red-600' };
const STATUS_COLORS = { available: 'text-green-600', issued: 'text-blue-600', reserved: 'text-yellow-600', lost: 'text-red-500', damaged: 'text-orange-500', withdrawn: 'text-gray-400' };

export default function CatalogTab() {
    const [books, setBooks] = useState([]);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'addBook' | 'addCopy' | 'editBook' | 'barcodes'
    const [selected, setSelected] = useState(null); // selected book
    const [expanded, setExpanded] = useState(null); // expanded book id for copies
    const [copies, setCopies] = useState({}); // { bookId: [copies] }
    const [loadingCopies, setLoadingCopies] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (q) params.set('q', q);
            const res = await fetch(`/api/v1/library/books?${params}`);
            const data = await res.json();
            setBooks(data.books || []);
            setTotal(data.total || 0);
        } finally { setLoading(false); }
    }, [q, page]);

    useEffect(() => { load(); }, [load]);

    async function toggleExpand(bookId) {
        if (expanded === bookId) { setExpanded(null); return; }
        setExpanded(bookId);
        if (!copies[bookId]) {
            setLoadingCopies(bookId);
            const res = await fetch(`/api/v1/library/books/${bookId}/copies`);
            const data = await res.json();
            setCopies(c => ({ ...c, [bookId]: data.copies || [] }));
            setLoadingCopies(null);
        }
    }

    async function deactivate(bookId) {
        if (!confirm('Deactivate this book? It will be hidden from the catalog.')) return;
        await fetch(`/api/v1/library/books/${bookId}`, { method: 'DELETE' });
        await load();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={q}
                        onChange={e => { setQ(e.target.value); setPage(1); }}
                        placeholder="Search title, author…"
                        className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </div>
                <button onClick={() => load()} className="p-2 border rounded-lg hover:bg-gray-50" title="Refresh">
                    <RefreshCw size={15} />
                </button>
                <button onClick={() => setModal('addBook')} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800">
                    <Plus size={15} /> Add Book
                </button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
            ) : books.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                    <LibraryEmptyIllustration className="w-24 h-24 mx-auto opacity-85" />
                    <div>
                        <p className="text-sm font-bold text-slate-800">{q ? 'No matching books found' : 'No books catalogued yet'}</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {q ? 'Try searching by title, author name, or ISBN.' : 'Get started by clicking "Add Book" above to register your first title.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden divide-y">
                    {books.map(book => (
                        <div key={book._id}>
                            <div className="px-4 py-3 flex items-center gap-3">
                                {/* Cover thumbnail */}
                                <div className="w-10 h-14 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                    {book.coverUrl
                                        ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                                        : <BookOpen size={18} className="m-auto mt-3 text-gray-300" />
                                    }
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm truncate">{book.title}</p>
                                    <p className="text-xs text-gray-500 truncate">{book.authors?.join(', ')}</p>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                        {book.isbn && <span>ISBN: {book.isbn}</span>}
                                        <span className="text-green-600 font-medium">{book.copies?.available || 0} available</span>
                                        <span>{book.copies?.total || 0} total</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => { setSelected(book); setModal('addCopy'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Add copies"><Plus size={15} /></button>
                                    <button onClick={() => { setSelected(book); setCopies(c => ({ ...c, [book._id]: undefined })); setModal('barcodes'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Print labels"><Printer size={15} /></button>
                                    <button onClick={() => { setSelected(book); setModal('editBook'); }} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Pencil size={14} /></button>
                                    <button onClick={() => deactivate(book._id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500" title="Deactivate"><Trash2 size={14} /></button>
                                    <button onClick={() => toggleExpand(book._id)} className="p-1.5 hover:bg-gray-100 rounded">
                                        {expanded === book._id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </button>
                                </div>
                            </div>
                            {/* Copies accordion */}
                            {expanded === book._id && (
                                <div className="border-t bg-gray-50 px-4 py-3">
                                    {loadingCopies === book._id ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Loading copies…</div>
                                    ) : (copies[book._id] || []).length === 0 ? (
                                        <p className="text-sm text-gray-400">No copies yet.</p>
                                    ) : (
                                        <div className="divide-y">
                                            {(copies[book._id] || []).map(copy => (
                                                <div key={copy._id} className="py-2 flex items-center gap-3 text-sm">
                                                    <span className="font-mono text-xs font-semibold w-36">{copy.accessionNumber}</span>
                                                    <span className="text-xs text-gray-500">{copy.shelfLocation || '—'}</span>
                                                    <span className={`text-xs capitalize ml-auto ${STATUS_COLORS[copy.status] || ''}`}>{copy.status}</span>
                                                    <span className={`text-xs capitalize ${CONDITION_COLORS[copy.condition] || ''}`}>{copy.condition}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > 20 && (
                <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
                    <span>{total} books total</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Prev</button>
                        <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {modal === 'addBook' && (
                <AddBookModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
            )}
            {modal === 'addCopy' && selected && (
                <AddCopyModal book={selected} onClose={() => setModal(null)} onSaved={(newCopies) => {
                    setModal(null);
                    // Refresh copies for this book
                    setCopies(c => ({ ...c, [selected._id]: [...(c[selected._id] || []), ...newCopies] }));
                    load(); // refresh copy counts
                }} />
            )}
            {modal === 'editBook' && selected && (
                <EditBookModal book={selected} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
            )}
            {modal === 'barcodes' && selected && (
                <Modal
                    isOpen={true}
                    onClose={() => setModal(null)}
                    title={`Print Labels — ${selected.title}`}
                    className="max-w-lg"
                >
                    <BarcodeSheetLoader bookId={selected._id} />
                </Modal>
            )}
        </div>
    );
}

function BarcodeSheetLoader({ bookId }) {
    const [copies, setCopies] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`/api/v1/library/books/${bookId}/copies`)
            .then(r => r.json())
            .then(d => setCopies(d.copies || []))
            .finally(() => setLoading(false));
    }, [bookId]);
    if (loading) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Loading copies…</div>;
    return <BarcodeSheet copies={copies} />;
}
