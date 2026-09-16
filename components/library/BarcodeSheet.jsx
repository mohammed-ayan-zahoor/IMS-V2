'use client';
import { useState } from 'react';
import { Printer, CheckSquare, Square } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function BarcodeSheet({ copies = [] }) {
    const [selected, setSelected] = useState(new Set(copies.map(c => c._id)));
    const [printing, setPrinting] = useState(false);

    const toggle = id => setSelected(s => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    const toggleAll = () => {
        if (selected.size === copies.length) setSelected(new Set());
        else setSelected(new Set(copies.map(c => c._id)));
    };

    async function printSheet() {
        if (!selected.size) return;
        setPrinting(true);
        try {
            const res = await fetch('/api/v1/library/barcode/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ copyIds: Array.from(selected) })
            });
            if (!res.ok) throw new Error('Failed to generate sheet');
            const html = await res.text();
            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();
            win.focus();
            win.print();
        } catch (err) {
            alert(err.message);
        } finally { setPrinting(false); }
    }

    if (!copies.length) return (
        <p className="text-sm text-gray-400 py-4">No copies added yet. Add copies first to print barcode labels.</p>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={toggleAll} className="text-sm text-gray-600 hover:text-black flex items-center gap-1.5">
                    {selected.size === copies.length ? <CheckSquare size={15} /> : <Square size={15} />}
                    {selected.size === copies.length ? 'Deselect all' : 'Select all'} ({copies.length})
                </button>
                <Button
                    size="sm"
                    onClick={printSheet}
                    disabled={!selected.size}
                    loading={printing}
                >
                    <Printer size={14} />
                    Print {selected.size} Label{selected.size !== 1 ? 's' : ''}
                </Button>
            </div>

            <div className="divide-y border rounded-xl overflow-hidden">
                {copies.map(copy => (
                    <label key={copy._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={selected.has(copy._id)} onChange={() => toggle(copy._id)} className="w-4 h-4 rounded border-gray-300" />
                        <span className="font-mono text-sm font-medium">{copy.accessionNumber}</span>
                        <span className="text-xs text-gray-500">{copy.shelfLocation || 'No shelf set'}</span>
                        <span className={`ml-auto text-xs capitalize px-2 py-0.5 rounded-full border ${
                            copy.status === 'available' ? 'border-green-200 text-green-700 bg-green-50' :
                            copy.status === 'issued' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                            'border-gray-200 text-gray-500'}`}>
                            {copy.status}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
}
