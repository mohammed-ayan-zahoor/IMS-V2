import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import { fetchCoverUrl } from '@/lib/library/coverFetch';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import LibraryTransaction from '@/models/LibraryTransaction';

export async function GET(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const book = await Book.findOne({ _id: id, institute: instituteId }).lean();
        if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const copies = await BookCopy.find({ book: id, institute: instituteId })
            .sort({ accessionNumber: 1 })
            .lean();

        return NextResponse.json({ book, copies });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const body = await req.json();
        const { refreshCover, ...fields } = body;

        const book = await Book.findOne({ _id: id, institute: instituteId });
        if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Force cover refresh from Open Library
        if (refreshCover && book.isbn) {
            const url = await fetchCoverUrl(book.isbn);
            fields.coverUrl = url;
            fields.coverFetched = true;
        }

        Object.assign(book, fields);
        await book.save();
        return NextResponse.json({ book });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        if (e.code === 11000) return NextResponse.json({ error: 'ISBN already exists' }, { status: 409 });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        // Check for active loans before soft-deleting
        const activeLoan = await LibraryTransaction.findOne({
            book: id,
            institute: instituteId,
            status: 'active'
        }).lean();
        if (activeLoan) return NextResponse.json({ error: 'Cannot deactivate — copies are currently issued' }, { status: 409 });

        await Book.findOneAndUpdate({ _id: id, institute: instituteId }, { isActive: false });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
