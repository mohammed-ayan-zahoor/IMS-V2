import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getLibraryAuth } from '@/lib/library/auth';
import { computeFine } from '@/lib/library/fineEngine';
import BookCopy from '@/models/BookCopy';
import Book from '@/models/Book';
import LibraryTransaction from '@/models/LibraryTransaction';
import LibraryHold from '@/models/LibraryHold';
import LibrarySettings from '@/models/LibrarySettings';
import User from '@/models/User';

async function resolveActiveTransaction({ transactionId, accessionNumber, copyId, instituteId }) {
    if (transactionId) {
        return LibraryTransaction.findOne({ _id: transactionId, institute: instituteId, status: 'active' });
    }
    const raw = (accessionNumber || copyId || '').toString().trim().toUpperCase();
    if (!raw) return null;

    const copy = await BookCopy.findOne({
        institute: instituteId,
        $or: [
            ...(mongoose.Types.ObjectId.isValid(raw) ? [{ _id: raw }] : []),
            { accessionNumber: raw }
        ]
    }).lean();

    if (!copy) return null;
    return LibraryTransaction.findOne({ institute: instituteId, bookCopy: copy._id, status: 'active' });
}

async function getSettings(instituteId) {
    const doc = await LibrarySettings.findOne({ institute: instituteId }).lean();
    return doc || { loanRules: {}, fineConfig: { enabled: false }, holdExpiryDays: 3, defaultReplacementCost: 500 };
}

function loanRuleFor(settings, role) {
    return settings?.loanRules?.[role] || { durationDays: 14, maxBooks: 3, renewalLimit: 2 };
}

// Advance the hold queue after a copy becomes available
async function advanceHoldQueue(instituteId, bookId, copyId, holdExpiryDays) {
    const nextHold = await LibraryHold.findOne(
        { institute: instituteId, book: bookId, status: 'waiting' },
        null,
        { sort: { requestedAt: 1 } }
    );
    if (!nextHold) {
        await BookCopy.findByIdAndUpdate(copyId, { status: 'available', reservedForHold: null });
        return;
    }
    const expiresAt = new Date(Date.now() + holdExpiryDays * 86_400_000);
    await Promise.all([
        BookCopy.findByIdAndUpdate(copyId, { status: 'reserved', reservedForHold: nextHold._id }),
        LibraryHold.findByIdAndUpdate(nextHold._id, { status: 'ready', readyAt: new Date(), expiresAt })
    ]);
}

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const patronId = searchParams.get('patron');
        const status = searchParams.get('status') || 'active';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

        const filter = { institute: instituteId, status };
        if (patronId) filter.patron = patronId;

        const [transactions, total] = await Promise.all([
            LibraryTransaction.find(filter)
                .populate('bookCopy', 'accessionNumber shelfLocation')
                .populate('book', 'title authors coverUrl')
                .populate('patron', 'profile.firstName profile.lastName profile.phone enrollmentNumber grNumber admissionStd role')
                .populate('issuedBy', 'profile.firstName profile.lastName')
                .sort({ issuedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            LibraryTransaction.countDocuments(filter)
        ]);

        return NextResponse.json({ transactions, total, page, limit });
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
        const { action, copyId, accessionNumber, patronId, transactionId, notes, fineCollectedBy } = body;

        if (!action) return NextResponse.json({ error: 'action is required (issue|return|renew|lost|mark_fine_paid)' }, { status: 400 });

        const settings = await getSettings(instituteId);

        // ── ISSUE ────────────────────────────────────────────────────────────
        if (action === 'issue') {
            const rawAccession = (accessionNumber || copyId || '').toString().trim().toUpperCase();
            if (!rawAccession || !patronId) return NextResponse.json({ error: 'Accession number (or copyId) and patronId required' }, { status: 400 });

            const patron = await User.findOne({ _id: patronId, institute: instituteId, deletedAt: null }).lean();
            if (!patron) return NextResponse.json({ error: 'Patron not found' }, { status: 404 });

            const rule = loanRuleFor(settings, patron.role);

            // Find copy by ObjectId or accession number
            const copyFilter = { institute: instituteId, status: { $in: ['available', 'reserved'] } };
            if (mongoose.Types.ObjectId.isValid(rawAccession) && !accessionNumber) {
                copyFilter._id = rawAccession;
            } else {
                copyFilter.accessionNumber = rawAccession;
            }

            // Atomic status guard — null means already taken
            const copy = await BookCopy.findOneAndUpdate(
                copyFilter,
                { status: 'issued' },
                { new: true }
            );
            if (!copy) return NextResponse.json({ error: `Book copy "${rawAccession}" is not available for issue` }, { status: 409 });

            // If copy was reserved for a hold, verify patron matches
            if (copy.reservedForHold) {
                const hold = await LibraryHold.findById(copy.reservedForHold).lean();
                if (hold && hold.patron.toString() !== patronId) {
                    // Roll back
                    await BookCopy.findByIdAndUpdate(copy._id, { status: 'reserved' });
                    const expiresMsg = hold.expiresAt ? ` until ${hold.expiresAt.toDateString()}` : '';
                    return NextResponse.json({ error: `This copy is reserved for another patron${expiresMsg}` }, { status: 409 });
                }
            }

            // maxBooks check
            const activeCount = await LibraryTransaction.countDocuments({
                institute: instituteId, patron: patronId, status: 'active'
            });
            if (activeCount >= rule.maxBooks) {
                await BookCopy.findByIdAndUpdate(copy._id, { status: copy.reservedForHold ? 'reserved' : 'available' });
                return NextResponse.json({ error: `Patron has reached the borrowing limit (${rule.maxBooks} books)` }, { status: 409 });
            }

            const dueDate = new Date(Date.now() + rule.durationDays * 86_400_000);
            const txn = await LibraryTransaction.create({
                institute: instituteId,
                bookCopy: copy._id,
                book: copy.book,
                patron: patronId,
                issuedBy: session.user.id,
                dueDate, notes
            });

            // Fulfill hold if applicable
            if (copy.reservedForHold) {
                await LibraryHold.findByIdAndUpdate(copy.reservedForHold, { status: 'fulfilled' });
                await BookCopy.findByIdAndUpdate(copy._id, { reservedForHold: null });
            }

            await txn.populate([
                { path: 'book', select: 'title authors coverUrl' },
                { path: 'bookCopy', select: 'accessionNumber shelfLocation' },
                { path: 'patron', select: 'profile.firstName profile.lastName profile.phone enrollmentNumber grNumber role' }
            ]);

            return NextResponse.json({ transaction: txn }, { status: 201 });
        }

        // ── RETURN ───────────────────────────────────────────────────────────
        if (action === 'return') {
            const txn = await resolveActiveTransaction({ transactionId, accessionNumber, copyId, instituteId });
            if (!txn) return NextResponse.json({ error: 'Active loan not found for this book' }, { status: 404 });

            const now = new Date();
            const fine = computeFine(txn.dueDate, now, settings.fineConfig);
            txn.status = 'returned';
            txn.returnedAt = now;
            txn.fineAmount = fine;
            if (notes) txn.notes = notes;
            await txn.save();

            await advanceHoldQueue(instituteId, txn.book, txn.bookCopy, settings.holdExpiryDays || 3);

            await txn.populate([
                { path: 'book', select: 'title authors coverUrl' },
                { path: 'bookCopy', select: 'accessionNumber shelfLocation' },
                { path: 'patron', select: 'profile.firstName profile.lastName profile.phone enrollmentNumber grNumber role' }
            ]);

            return NextResponse.json({ transaction: txn, fineAmount: fine });
        }

        // ── RENEW ────────────────────────────────────────────────────────────
        if (action === 'renew') {
            const txn = await resolveActiveTransaction({ transactionId, accessionNumber, copyId, instituteId });
            if (!txn) return NextResponse.json({ error: 'Active loan not found for this book' }, { status: 404 });
            await txn.populate('patron', 'role');

            const rule = loanRuleFor(settings, txn.patron?.role);

            if (txn.renewalHistory.length >= rule.renewalLimit) {
                return NextResponse.json({ error: `Renewal limit reached (${rule.renewalLimit})` }, { status: 409 });
            }

            // Can't renew if someone is waiting on this book
            const waitingHold = await LibraryHold.findOne({ institute: instituteId, book: txn.book, status: 'waiting' }).lean();
            if (waitingHold) return NextResponse.json({ error: 'Cannot renew — another patron is waiting for this book' }, { status: 409 });

            const previousDueDate = txn.dueDate;
            const newDueDate = new Date(txn.dueDate.getTime() + rule.durationDays * 86_400_000);
            txn.renewalHistory.push({ renewedAt: new Date(), previousDueDate, newDueDate, renewedBy: session.user.id });
            txn.dueDate = newDueDate;
            if (notes) txn.notes = notes;
            await txn.save();

            await txn.populate([
                { path: 'book', select: 'title authors coverUrl' },
                { path: 'bookCopy', select: 'accessionNumber shelfLocation' },
                { path: 'patron', select: 'profile.firstName profile.lastName profile.phone enrollmentNumber grNumber role' }
            ]);

            return NextResponse.json({ transaction: txn });
        }

        // ── LOST ─────────────────────────────────────────────────────────────
        if (action === 'lost') {
            const txn = await resolveActiveTransaction({ transactionId, accessionNumber, copyId, instituteId });
            if (!txn) return NextResponse.json({ error: 'Active loan not found for this book' }, { status: 404 });

            const book = await Book.findById(txn.book).lean();
            const fine = book?.replacementCost ?? settings.defaultReplacementCost ?? 500;

            txn.status = 'lost';
            txn.returnedAt = new Date();
            txn.fineAmount = fine;
            if (notes) txn.notes = notes;
            await txn.save();

            await BookCopy.findByIdAndUpdate(txn.bookCopy, { status: 'lost' });

            await txn.populate([
                { path: 'book', select: 'title authors coverUrl' },
                { path: 'bookCopy', select: 'accessionNumber shelfLocation' },
                { path: 'patron', select: 'profile.firstName profile.lastName profile.phone enrollmentNumber grNumber role' }
            ]);

            return NextResponse.json({ transaction: txn, fineAmount: fine });
        }

        // ── MARK FINE PAID ───────────────────────────────────────────────────
        if (action === 'mark_fine_paid') {
            if (!transactionId) return NextResponse.json({ error: 'transactionId required' }, { status: 400 });

            const txn = await LibraryTransaction.findOne({
                _id: transactionId,
                institute: instituteId,
                status: { $in: ['returned', 'lost'] },
                finePaid: false
            });
            if (!txn) return NextResponse.json({ error: 'Transaction not found or fine already paid' }, { status: 404 });

            txn.finePaid = true;
            txn.fineCollectedBy = fineCollectedBy || session.user.id;
            await txn.save();
            return NextResponse.json({ transaction: txn });
        }

        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        if (e.code === 11000) return NextResponse.json({ error: 'Concurrent issue conflict — please retry' }, { status: 409 });
        console.error('[Circulation Action Error]', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
