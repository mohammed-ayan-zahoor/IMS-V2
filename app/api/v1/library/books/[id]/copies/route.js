import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import LibrarySettings from '@/models/LibrarySettings';

export async function GET(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const copies = await BookCopy.find({ book: id, institute: instituteId })
            .sort({ accessionNumber: 1 })
            .lean();
        return NextResponse.json({ copies });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;

        const book = await Book.findOne({ _id: id, institute: instituteId }).lean();
        if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

        const body = await req.json();
        const { condition, shelfLocation, notes, count = 1 } = body;

        // Allow bulk add (count > 1) — common when cataloguing new stock
        const n = Math.min(50, Math.max(1, parseInt(count)));

        // Get prefix for accession number
        const settings = await LibrarySettings.findOne({ institute: instituteId }).lean();
        const prefix = settings?.barcodePrefix || 'LIB';

        // Insert one-by-one so the pre-save hook generates sequential accession numbers
        const created = [];
        for (let i = 0; i < n; i++) {
            const copy = await BookCopy.create({
                institute: instituteId,
                book: id,
                condition: condition || 'good',
                shelfLocation, notes
            });
            created.push(copy);
        }

        return NextResponse.json({ copies: created }, { status: 201 });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
