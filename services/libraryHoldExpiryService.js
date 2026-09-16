import { connectDB } from '@/lib/mongodb';
import LibraryHold from '@/models/LibraryHold';
import BookCopy from '@/models/BookCopy';
import LibrarySettings from '@/models/LibrarySettings';

/**
 * Called every 24h by instrumentation.js.
 * Finds ready holds past their expiresAt, cancels them, and
 * either advances to the next waiter or frees the copy.
 */
export async function expireLibraryHolds() {
    await connectDB();

    const stale = await LibraryHold.find({
        status: 'ready',
        expiresAt: { $lt: new Date() }
    }).lean();

    if (!stale.length) return;

    for (const hold of stale) {
        const copy = await BookCopy.findOne({ reservedForHold: hold._id }).lean();

        const nextHold = await LibraryHold.findOne(
            { institute: hold.institute, book: hold.book, status: 'waiting' },
            null,
            { sort: { requestedAt: 1 } }
        ).lean();

        if (copy) {
            if (nextHold) {
                const settings = await LibrarySettings.findOne({ institute: hold.institute }).lean();
                const expiryDays = settings?.holdExpiryDays || 3;
                const expiresAt = new Date(Date.now() + expiryDays * 86_400_000);
                await Promise.all([
                    BookCopy.findByIdAndUpdate(copy._id, { reservedForHold: nextHold._id }),
                    LibraryHold.findByIdAndUpdate(nextHold._id, { status: 'ready', readyAt: new Date(), expiresAt })
                ]);
            } else {
                await BookCopy.findByIdAndUpdate(copy._id, { status: 'available', reservedForHold: null });
            }
        }

        await LibraryHold.findByIdAndUpdate(hold._id, { status: 'cancelled' });
        console.log(`[Library] Expired hold ${hold._id} for book ${hold.book}`);
    }
}
