import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibraryHold from '@/models/LibraryHold';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // waiting|ready|fulfilled|cancelled
        const patronId = searchParams.get('patron');

        // Lazy expiry sweep on read — expire ready holds past their expiresAt
        // before returning results, so the UI always sees current state
        await expireStaleHolds(instituteId);

        const filter = { institute: instituteId };
        if (status) filter.status = status;
        else filter.status = { $in: ['waiting', 'ready'] }; // default: active holds
        if (patronId) filter.patron = patronId;

        const holds = await LibraryHold.find(filter)
            .populate('book', 'title authors coverUrl')
            .populate('patron', 'profile.firstName profile.lastName enrollmentNumber grNumber admissionStd role')
            .sort({ requestedAt: 1 })
            .lean();

        return NextResponse.json({ holds });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { bookId, patronId } = await req.json();

        if (!bookId || !patronId) return NextResponse.json({ error: 'bookId and patronId required' }, { status: 400 });

        const hold = await LibraryHold.create({
            institute: instituteId,
            book: bookId,
            patron: patronId
        });

        return NextResponse.json({ hold }, { status: 201 });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        if (e.code === 11000) return NextResponse.json({ error: 'Patron already has an active hold on this book' }, { status: 409 });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

async function expireStaleHolds(instituteId) {
    const BookCopy = (await import('@/models/BookCopy')).default;
    const stale = await LibraryHold.find({
        institute: instituteId,
        status: 'ready',
        expiresAt: { $lt: new Date() }
    }).lean();

    for (const hold of stale) {
        // Release the reserved copy back into the queue
        const copy = await BookCopy.findOne({ institute: instituteId, reservedForHold: hold._id });
        if (copy) {
            // Check for next waiter
            const nextHold = await LibraryHold.findOne(
                { institute: instituteId, book: hold.book, status: 'waiting' },
                null,
                { sort: { requestedAt: 1 } }
            );
            if (nextHold) {
                const LibrarySettings = (await import('@/models/LibrarySettings')).default;
                const settings = await LibrarySettings.findOne({ institute: instituteId }).lean();
                const expiryDays = settings?.holdExpiryDays || 3;
                const expiresAt = new Date(Date.now() + expiryDays * 86_400_000);
                await Promise.all([
                    copy.updateOne({ reservedForHold: nextHold._id }),
                    nextHold.updateOne({ status: 'ready', readyAt: new Date(), expiresAt })
                ]);
            } else {
                await copy.updateOne({ status: 'available', reservedForHold: null });
            }
        }
        await LibraryHold.findByIdAndUpdate(hold._id, { status: 'cancelled' });
    }
}
