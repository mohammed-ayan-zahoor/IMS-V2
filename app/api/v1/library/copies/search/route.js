import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim();
        const statusParam = searchParams.get('status'); // 'available' | 'all' | other

        if (!q) {
            return NextResponse.json({ copies: [] });
        }

        const escaped = escapeRegExp(q);
        const re = new RegExp(escaped, 'i');

        // Find matching books first
        const matchedBooks = await Book.find({
            institute: instituteId,
            isActive: true,
            $or: [
                { title: re },
                { authors: re },
                { isbn: re }
            ]
        }).select('_id').limit(20).lean();

        const bookIds = matchedBooks.map(b => b._id);

        // Find copies matching either book or accession number
        const copyFilter = {
            institute: instituteId,
            $or: [
                { accessionNumber: re },
                ...(bookIds.length > 0 ? [{ book: { $in: bookIds } }] : [])
            ]
        };

        if (statusParam && statusParam !== 'all') {
            copyFilter.status = statusParam;
        } else if (!statusParam) {
            copyFilter.status = 'available';
        }

        const copies = await BookCopy.find(copyFilter)
            .populate('book', 'title authors coverUrl isbn')
            .sort({ accessionNumber: 1 })
            .limit(15)
            .lean();

        return NextResponse.json({ copies });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        console.error('[Library Copy Search Error]', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
