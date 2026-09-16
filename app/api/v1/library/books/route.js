import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import { fetchCoverUrl } from '@/lib/library/coverFetch';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

        const filter = { institute: instituteId, isActive: true };
        if (q) filter.$text = { $search: q };

        const [books, total] = await Promise.all([
            Book.find(filter)
                .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Book.countDocuments(filter)
        ]);

        // One aggregate call for all visible books — no N+1
        const bookIds = books.map(b => b._id);
        const copyCounts = await BookCopy.aggregate([
            { $match: { institute: books[0]?.institute, book: { $in: bookIds } } },
            { $group: { _id: { book: '$book', status: '$status' }, count: { $sum: 1 } } }
        ]);

        const copyMap = {};
        for (const row of copyCounts) {
            const id = row._id.book.toString();
            if (!copyMap[id]) copyMap[id] = { total: 0 };
            copyMap[id][row._id.status] = row.count;
            copyMap[id].total += row.count;
        }

        const result = books.map(b => ({ ...b, copies: copyMap[b._id.toString()] || { total: 0 } }));
        return NextResponse.json({ books: result, total, page, limit });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { session, instituteId } = await getLibraryAuth();
        const body = await req.json();
        const { title, authors, publisher, edition, isbn, replacementCost, initialCopies = 1, shelfLocation } = body;

        if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

        // Fetch cover from Open Library if ISBN provided
        let coverUrl = null;
        let coverFetched = false;
        if (isbn) {
            coverUrl = await fetchCoverUrl(isbn);
            coverFetched = true;
        }

        const book = await Book.create({
            institute: instituteId,
            title: title.trim(),
            authors: (authors || []).map(a => a.trim()).filter(Boolean),
            publisher, edition,
            isbn: isbn?.trim() || undefined,
            coverUrl, coverFetched,
            replacementCost: replacementCost ?? undefined
        });

        // Automatically create initial physical copies
        const copyCount = Math.min(50, Math.max(0, parseInt(initialCopies ?? 1)));
        const createdCopies = [];
        for (let i = 0; i < copyCount; i++) {
            const copy = await BookCopy.create({
                institute: instituteId,
                book: book._id,
                condition: 'good',
                shelfLocation: shelfLocation?.trim() || undefined
            });
            createdCopies.push(copy);
        }

        return NextResponse.json({ book, copies: createdCopies }, { status: 201 });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        if (e.code === 11000) return NextResponse.json({ error: 'A book with this ISBN already exists' }, { status: 409 });
        console.error('[Library Book Create Error]', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
