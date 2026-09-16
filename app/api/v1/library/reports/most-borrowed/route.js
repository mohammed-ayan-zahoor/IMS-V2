import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibraryTransaction from '@/models/LibraryTransaction';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));

        const mostBorrowed = await LibraryTransaction.aggregate([
            { $match: { institute: instituteId } },
            { $group: { _id: '$book', issueCount: { $sum: 1 } } },
            { $sort: { issueCount: -1 } },
            { $limit: limit },
            { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
            { $unwind: '$book' },
            { $project: { title: '$book.title', authors: '$book.authors', coverUrl: '$book.coverUrl', issueCount: 1 } }
        ]);

        return NextResponse.json({ mostBorrowed });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
