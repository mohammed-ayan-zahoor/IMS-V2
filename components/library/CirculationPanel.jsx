'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, CheckCircle, AlertTriangle, User, X, BookOpen, Clock, RotateCcw, AlertCircle } from 'lucide-react';

export default function CirculationPanel() {
    const [mode, setMode] = useState('issue'); // issue | return | renew | lost
    const [input, setInput] = useState(''); // accession number from scanner or manual search term
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fine, setFine] = useState(null);

    // Patron search state
    const [patronQuery, setPatronQuery] = useState('');
    const [patronResults, setPatronResults] = useState([]);
    const [searchingPatron, setSearchingPatron] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedPatron, setSelectedPatron] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Book copy search state (for no-barcode users)
    const [selectedCopy, setSelectedCopy] = useState(null);
    const [copyResults, setCopyResults] = useState([]);
    const [searchingCopy, setSearchingCopy] = useState(false);
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const [focusedCopyIndex, setFocusedCopyIndex] = useState(-1);

    // Patron's active loans (for return/renew via patron lookup)
    const [patronLoans, setPatronLoans] = useState([]);
    const [loadingLoans, setLoadingLoans] = useState(false);

    // All active loans across the library
    const [allActiveLoans, setAllActiveLoans] = useState([]);
    const [loadingAllLoans, setLoadingAllLoans] = useState(false);

    const scanRef = useRef(null);
    const patronInputRef = useRef(null);
    const dropdownRef = useRef(null);
    const copyDropdownRef = useRef(null);
    const searchAbortRef = useRef(null);
    const copySearchAbortRef = useRef(null);

    async function loadAllActiveLoans() {
        setLoadingAllLoans(true);
        try {
            const res = await fetch('/api/v1/library/circulation?status=active&limit=50');
            if (res.ok) {
                const data = await res.json();
                setAllActiveLoans(data.transactions || []);
            }
        } catch (e) {
            console.error('Failed to load all active loans', e);
        } finally {
            setLoadingAllLoans(false);
        }
    }

    useEffect(() => {
        loadAllActiveLoans();
    }, []);

    // Autofocus scanner input whenever mode changes (or patron input if issue and no patron selected)
    useEffect(() => {
        setResult(null);
        setError('');
        setFine(null);
        setInput('');
        setSelectedCopy(null);
        setCopyResults([]);
        setIsCopyDropdownOpen(false);

        if (mode === 'issue' && !selectedPatron) {
            patronInputRef.current?.focus();
        } else {
            scanRef.current?.focus();
        }
    }, [mode]);

    // Click outside to close patron & copy dropdowns
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
            if (copyDropdownRef.current && !copyDropdownRef.current.contains(e.target)) {
                setIsCopyDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced patron search
    useEffect(() => {
        if (!patronQuery.trim()) {
            setPatronResults([]);
            setIsDropdownOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (searchAbortRef.current) searchAbortRef.current.abort();
            const controller = new AbortController();
            searchAbortRef.current = controller;

            setSearchingPatron(true);
            try {
                const res = await fetch(`/api/v1/library/patrons?q=${encodeURIComponent(patronQuery.trim())}`, {
                    signal: controller.signal
                });
                if (res.ok) {
                    const data = await res.json();
                    setPatronResults(data.patrons || []);
                    setIsDropdownOpen(true);
                    setFocusedIndex(-1);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Patron search failed', err);
                }
            } finally {
                if (searchAbortRef.current === controller) {
                    setSearchingPatron(false);
                }
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [patronQuery]);

    // Debounced book copy search (by title, author, or barcode prefix)
    useEffect(() => {
        // If a copy is already selected or input is empty, don't trigger search
        if (selectedCopy || !input.trim()) {
            setCopyResults([]);
            setIsCopyDropdownOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (copySearchAbortRef.current) copySearchAbortRef.current.abort();
            const controller = new AbortController();
            copySearchAbortRef.current = controller;

            setSearchingCopy(true);
            try {
                const statusFilter = mode === 'issue' ? 'available' : 'all';
                const res = await fetch(`/api/v1/library/copies/search?q=${encodeURIComponent(input.trim())}&status=${statusFilter}`, {
                    signal: controller.signal
                });
                if (res.ok) {
                    const data = await res.json();
                    setCopyResults(data.copies || []);
                    setIsCopyDropdownOpen(true);
                    setFocusedCopyIndex(-1);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Copy search failed', err);
                }
            } finally {
                if (copySearchAbortRef.current === controller) {
                    setSearchingCopy(false);
                }
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [input, selectedCopy, mode]);

    // When a patron is selected, fetch their active loans if in return/renew mode
    useEffect(() => {
        if (!selectedPatron) {
            setPatronLoans([]);
            return;
        }
        if (mode !== 'issue') {
            loadPatronLoans(selectedPatron._id || selectedPatron.id);
        }
    }, [selectedPatron, mode]);

    async function loadPatronLoans(patronId) {
        setLoadingLoans(true);
        try {
            const res = await fetch(`/api/v1/library/circulation?patron=${patronId}&status=active`);
            if (res.ok) {
                const data = await res.json();
                setPatronLoans(data.transactions || []);
            }
        } catch (err) {
            console.error('Failed to load patron loans', err);
        } finally {
            setLoadingLoans(false);
        }
    }

    function selectPatron(patron) {
        setSelectedPatron(patron);
        setPatronQuery('');
        setPatronResults([]);
        setIsDropdownOpen(false);
        setError('');
        setTimeout(() => {
            scanRef.current?.focus();
        }, 50);
    }

    function clearPatron() {
        setSelectedPatron(null);
        setPatronLoans([]);
        setPatronQuery('');
        setTimeout(() => {
            patronInputRef.current?.focus();
        }, 50);
    }

    function selectCopy(copy) {
        setSelectedCopy(copy);
        setInput(copy.accessionNumber);
        setCopyResults([]);
        setIsCopyDropdownOpen(false);
        setError('');
    }

    function clearCopy() {
        setSelectedCopy(null);
        setInput('');
        setCopyResults([]);
        setTimeout(() => {
            scanRef.current?.focus();
        }, 50);
    }

    function handlePatronKeyDown(e) {
        if (!isDropdownOpen || patronResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev < patronResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = focusedIndex >= 0 ? patronResults[focusedIndex] : patronResults[0];
            if (target) selectPatron(target);
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
        }
    }

    function handleCopyKeyDown(e) {
        if (!isCopyDropdownOpen || copyResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedCopyIndex(prev => (prev < copyResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedCopyIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && focusedCopyIndex >= 0) {
            e.preventDefault();
            const target = copyResults[focusedCopyIndex];
            if (target) selectCopy(target);
        } else if (e.key === 'Escape') {
            setIsCopyDropdownOpen(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const accession = (selectedCopy ? selectedCopy.accessionNumber : input.trim()).toUpperCase();
        if (!accession) return;

        setLoading(true);
        setResult(null);
        setError('');
        setFine(null);
        setIsCopyDropdownOpen(false);

        try {
            if (mode === 'issue') {
                if (!selectedPatron) {
                    setError('Please select a patron first');
                    patronInputRef.current?.focus();
                    setLoading(false);
                    return;
                }

                const res = await fetch('/api/v1/library/circulation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'issue',
                        accessionNumber: accession,
                        patronId: selectedPatron._id || selectedPatron.id
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to issue book');

                setResult({ type: 'issued', transaction: data.transaction, patron: selectedPatron });
                setInput('');
                setSelectedCopy(null);

                // Increment patron loan count locally
                setSelectedPatron(prev => prev ? { ...prev, activeLoansCount: (prev.activeLoansCount || 0) + 1 } : null);
                loadAllActiveLoans();

            } else if (mode === 'return' || mode === 'renew' || mode === 'lost') {
                const res = await fetch('/api/v1/library/circulation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: mode,
                        accessionNumber: accession
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Failed to ${mode} book`);

                if (data.fineAmount > 0) setFine(data.fineAmount);
                setResult({ type: mode, transaction: data.transaction });
                setInput('');
                setSelectedCopy(null);
                loadAllActiveLoans();

                // Refresh patron loans if loaded
                if (selectedPatron) {
                    loadPatronLoans(selectedPatron._id || selectedPatron.id);
                    if (mode === 'return' || mode === 'lost') {
                        setSelectedPatron(prev => prev ? { ...prev, activeLoansCount: Math.max(0, (prev.activeLoansCount || 1) - 1) } : null);
                    }
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            scanRef.current?.focus();
        }
    }

    // Quick action on patron loans list (Return / Renew / Lost with 1 click)
    async function handleDirectAction(action, transactionId) {
        setLoading(true);
        setResult(null);
        setError('');
        setFine(null);

        try {
            const res = await fetch('/api/v1/library/circulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, transactionId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${action} book`);

            if (data.fineAmount > 0) setFine(data.fineAmount);
            setResult({ type: action, transaction: data.transaction });
            loadAllActiveLoans();

            if (selectedPatron) {
                loadPatronLoans(selectedPatron._id || selectedPatron.id);
                if (action === 'return' || action === 'lost') {
                    setSelectedPatron(prev => prev ? { ...prev, activeLoansCount: Math.max(0, (prev.activeLoansCount || 1) - 1) } : null);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap items-center">
                {['issue', 'return', 'renew', 'lost'].map(m => (
                    <button
                        key={m}
                        onClick={() => {
                            setMode(m);
                            setResult(null);
                            setError('');
                            setFine(null);
                            setInput('');
                            setSelectedCopy(null);
                        }}
                        className={`px-4 py-2 text-sm rounded-lg border font-medium capitalize transition-colors ${mode === m ? 'bg-black text-white border-black shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <div className="space-y-5">
                {/* 1. PATRON SELECTOR */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-800">
                            Patron {mode === 'issue' ? <span className="text-rose-500">*</span> : <span className="text-xs text-slate-400 font-normal">(Optional — look up student to see all their active loans)</span>}
                        </label>
                        {selectedPatron && (
                            <button
                                type="button"
                                onClick={clearPatron}
                                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                            >
                                Change patron
                            </button>
                        )}
                    </div>

                    {selectedPatron ? (
                        /* Selected Patron Card */
                        <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3.5 flex items-center justify-between gap-3 max-w-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                    {selectedPatron.name.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-slate-900 truncate">{selectedPatron.name}</p>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                            {selectedPatron.role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                                        {selectedPatron.grNumber && <span>GR: <strong className="text-slate-700">{selectedPatron.grNumber}</strong></span>}
                                        {selectedPatron.admissionStd && <span>· Std: <strong className="text-slate-700">{selectedPatron.admissionStd}</strong></span>}
                                        {selectedPatron.enrollmentNumber && <span>· ID: <span className="font-mono text-slate-700">{selectedPatron.enrollmentNumber}</span></span>}
                                        {selectedPatron.phone && <span>· Ph: {selectedPatron.phone}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedPatron.activeLoansCount >= selectedPatron.maxBooks ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-700 border-slate-200'}`}>
                                        {selectedPatron.activeLoansCount} / {selectedPatron.maxBooks} books
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearPatron}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                                    title="Deselect patron"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Patron Search Combobox Input */
                        <div className="relative max-w-xl" ref={dropdownRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                <input
                                    ref={patronInputRef}
                                    type="text"
                                    value={patronQuery}
                                    onChange={e => setPatronQuery(e.target.value)}
                                    onFocus={() => { if (patronResults.length > 0) setIsDropdownOpen(true); }}
                                    onKeyDown={handlePatronKeyDown}
                                    placeholder="Search by student or staff name, GR no, roll no, phone, or ID…"
                                    className="w-full border border-slate-200 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
                                />
                                {searchingPatron && (
                                    <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                                )}
                            </div>

                            {/* Patron Dropdown Results */}
                            {isDropdownOpen && (
                                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                                    {patronResults.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No patrons found matching &quot;{patronQuery}&quot;
                                        </div>
                                    ) : (
                                        patronResults.map((p, idx) => (
                                            <button
                                                key={p.id || p._id}
                                                type="button"
                                                onClick={() => selectPatron(p)}
                                                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${idx === focusedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                                                        {p.name.slice(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                                {p.role}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                            {p.grNumber && <span>GR: <strong>{p.grNumber}</strong></span>}
                                                            {p.admissionStd && <span>· Std: {p.admissionStd}</span>}
                                                            {p.enrollmentNumber && <span>· ID: {p.enrollmentNumber}</span>}
                                                            {p.phone && <span>· {p.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${p.activeLoansCount >= p.maxBooks ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                        {p.activeLoansCount}/{p.maxBooks} loans
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. BOOK SELECTOR (SCAN BARCODE OR SEARCH TITLE) */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-800">
                            Book {mode === 'issue' && <span className="text-rose-500">*</span>}
                            <span className="ml-2 text-xs text-slate-400 font-normal">Scan barcode OR search by title / author</span>
                        </label>
                        {selectedCopy && (
                            <button
                                type="button"
                                onClick={clearCopy}
                                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                            >
                                Change book
                            </button>
                        )}
                    </div>

                    {selectedCopy ? (
                        /* Selected Copy Card */
                        <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3.5 flex items-center justify-between gap-3 max-w-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-12 bg-white border border-slate-200 rounded overflow-hidden flex items-center justify-center shrink-0">
                                    {selectedCopy.book?.coverUrl ? (
                                        <img src={selectedCopy.book.coverUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen size={16} className="text-slate-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{selectedCopy.book?.title || 'Book Title'}</p>
                                    <p className="text-xs text-slate-500 truncate">{selectedCopy.book?.authors?.join(', ') || 'Unknown Author'}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                                            {selectedCopy.accessionNumber}
                                        </span>
                                        {selectedCopy.shelfLocation && <span>· {selectedCopy.shelfLocation}</span>}
                                        <span className="text-emerald-700 font-medium">· Ready to issue</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || (mode === 'issue' && !selectedPatron)}
                                    className="px-3.5 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-40"
                                >
                                    {loading ? 'Processing…' : `${mode.charAt(0).toUpperCase() + mode.slice(1)} Book`}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearCopy}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                                    title="Deselect book"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Combined Title Search & Barcode Input Form */
                        <form onSubmit={handleSubmit} className="space-y-1">
                            <div className="relative max-w-xl" ref={copyDropdownRef}>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        <input
                                            ref={scanRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onFocus={() => { if (copyResults.length > 0) setIsCopyDropdownOpen(true); }}
                                            onKeyDown={handleCopyKeyDown}
                                            placeholder="Type title, author, or scan barcode (e.g. Clean Code, LIB-2026-000001)…"
                                            autoComplete="off"
                                            className="w-full border border-slate-200 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                        />
                                        {searchingCopy && (
                                            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !input.trim() || (mode === 'issue' && !selectedPatron)}
                                        className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2 font-medium shrink-0"
                                    >
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)} Book
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    No scanner? Just type the book title to pick a copy. If using a barcode scanner, scanning automatically submits.
                                </p>

                                {/* Copy Dropdown Results */}
                                {isCopyDropdownOpen && (
                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                                        {copyResults.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400">
                                                No copies found matching &quot;{input}&quot;
                                            </div>
                                        ) : (
                                            copyResults.map((c, idx) => (
                                                <button
                                                    key={c._id}
                                                    type="button"
                                                    onClick={() => selectCopy(c)}
                                                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${idx === focusedCopyIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-11 bg-slate-100 border border-slate-200 rounded overflow-hidden flex items-center justify-center shrink-0">
                                                            {c.book?.coverUrl ? (
                                                                <img src={c.book.coverUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <BookOpen size={14} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{c.book?.title}</p>
                                                            <p className="text-xs text-slate-500 truncate">{c.book?.authors?.join(', ')}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{c.accessionNumber}</span>
                                                                {c.shelfLocation && <span>· Shelf: {c.shelfLocation}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                {/* ERROR BANNER */}
                {error && (
                    <div className="flex items-start gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 max-w-xl">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* RESULT CARD */}
                {result && (
                    <div className="border rounded-xl p-5 bg-emerald-50 border-emerald-200 space-y-2.5 max-w-xl">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                            <CheckCircle size={18} />
                            {result.type === 'issued' && 'Book issued successfully'}
                            {result.type === 'return' && 'Book returned successfully'}
                            {result.type === 'renew' && 'Loan renewed successfully'}
                            {result.type === 'lost' && 'Book marked as lost'}
                        </div>
                        <div className="text-xs text-slate-700 space-y-1 bg-white/70 p-3 rounded-lg border border-emerald-200/60">
                            <p><span className="font-semibold text-slate-600">Title:</span> {result.transaction?.book?.title || '—'}</p>
                            <p><span className="font-semibold text-slate-600">Accession:</span> <span className="font-mono">{result.transaction?.bookCopy?.accessionNumber || '—'}</span></p>
                            {result.transaction?.patron && (
                                <p>
                                    <span className="font-semibold text-slate-600">Patron:</span>{' '}
                                    {result.transaction.patron.profile?.firstName} {result.transaction.patron.profile?.lastName}
                                    {result.transaction.patron.grNumber ? ` (GR: ${result.transaction.patron.grNumber})` : ''}
                                </p>
                            )}
                            {result.transaction?.dueDate && (
                                <p><span className="font-semibold text-slate-600">Due Date:</span> {new Date(result.transaction.dueDate).toLocaleDateString('en-IN')}</p>
                            )}
                            {fine !== null && fine > 0 && (
                                <p className="text-amber-800 font-bold">Fine Assessed: ₹{fine.toLocaleString('en-IN')}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* PATRON'S ACTIVE LOANS LIST (If patron selected during Return/Renew/Lost mode) */}
                {selectedPatron && mode !== 'issue' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-w-xl">
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen size={15} className="text-slate-500" />
                                <h4 className="text-xs font-bold text-slate-800">
                                    Currently Borrowed by {selectedPatron.name}
                                </h4>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                {patronLoans.length} {patronLoans.length === 1 ? 'book' : 'books'}
                            </span>
                        </div>

                        {loadingLoans ? (
                            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Loading active loans…
                            </div>
                        ) : patronLoans.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                This patron currently has no active loans.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {patronLoans.map(loan => {
                                    const isOverdue = new Date(loan.dueDate) < new Date();
                                    return (
                                        <div key={loan._id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-900 truncate">{loan.book?.title || 'Untitled'}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                                    <span className="font-mono bg-slate-100 px-1 rounded">{loan.bookCopy?.accessionNumber}</span>
                                                    <span>· Due {new Date(loan.dueDate).toLocaleDateString('en-IN')}</span>
                                                    {isOverdue && (
                                                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                                            <AlertCircle size={11} /> Overdue
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {mode === 'return' && (
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => handleDirectAction('return', loan._id)}
                                                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                                                    >
                                                        Return
                                                    </button>
                                                )}
                                                {mode === 'renew' && (
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => handleDirectAction('renew', loan._id)}
                                                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        <RotateCcw size={11} /> Renew
                                                    </button>
                                                )}
                                                {mode === 'lost' && (
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => handleDirectAction('lost', loan._id)}
                                                        className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
                                                    >
                                                        Mark Lost
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. ALL ACTIVE LOANS FEED (Desk Overview) */}
                <div className="pt-6 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Currently Active Loans ({allActiveLoans.length})
                            </h3>
                            <p className="text-xs text-slate-500">All books currently issued to students and staff</p>
                        </div>
                        <button
                            type="button"
                            onClick={loadAllActiveLoans}
                            disabled={loadingAllLoans}
                            className="text-xs font-semibold text-slate-600 hover:text-black flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1 rounded-lg"
                        >
                            {loadingAllLoans ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            Refresh
                        </button>
                    </div>

                    {loadingAllLoans && allActiveLoans.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50/50">
                            <Loader2 size={16} className="animate-spin mx-auto mb-2 text-slate-400" />
                            Loading active loans…
                        </div>
                    ) : allActiveLoans.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50/30">
                            No books are currently issued out.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3.5">Book Title</th>
                                            <th className="py-2.5 px-3.5">Accession</th>
                                            <th className="py-2.5 px-3.5">Patron</th>
                                            <th className="py-2.5 px-3.5">Due Date</th>
                                            <th className="py-2.5 px-3.5 text-right">Quick Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {allActiveLoans.map(loan => {
                                            const isOverdue = new Date(loan.dueDate) < new Date();
                                            return (
                                                <tr key={loan._id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                                                        {loan.book?.title || 'Untitled'}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                                                        {loan.bookCopy?.accessionNumber}
                                                    </td>
                                                    <td className="py-2.5 px-3.5">
                                                        <span className="font-semibold text-slate-900">
                                                            {loan.patron?.profile?.firstName} {loan.patron?.profile?.lastName}
                                                        </span>
                                                        <span className="text-[10px] uppercase ml-1 px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                                            {loan.patron?.role}
                                                        </span>
                                                        {loan.patron?.grNumber && (
                                                            <span className="text-[11px] text-slate-400 ml-1">
                                                                (GR: {loan.patron.grNumber})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3.5">
                                                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                                            {new Date(loan.dueDate).toLocaleDateString('en-IN')}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="ml-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                disabled={loading}
                                                                onClick={() => handleDirectAction('return', loan._id)}
                                                                className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-medium hover:bg-slate-800 disabled:opacity-50"
                                                            >
                                                                Return
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={loading}
                                                                onClick={() => handleDirectAction('renew', loan._id)}
                                                                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-[11px] font-medium hover:bg-slate-50 disabled:opacity-50"
                                                            >
                                                                Renew
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
