import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibraryHold from '@/models/LibraryHold';
import BookCopy from '@/models/BookCopy';

export async function PATCH(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const { status } = await req.json();

        if (!['fulfilled', 'cancelled'].includes(status)) {
            return NextResponse.json({ error: 'status must be fulfilled or cancelled' }, { status: 400 });
        }

        const hold = await LibraryHold.findOne({ _id: id, institute: instituteId });
        if (!hold) return NextResponse.json({ error: 'Hold not found' }, { status: 404 });

        if (['fulfilled', 'cancelled'].includes(hold.status)) {
            return NextResponse.json({ error: 'Hold is already closed' }, { status: 409 });
        }

        const previousStatus = hold.status;
        hold.status = status;
        await hold.save();

        // Release reserved copy if cancelling a ready hold
        if (status === 'cancelled' && previousStatus === 'ready') {
            const copy = await BookCopy.findOne({ institute: instituteId, reservedForHold: hold._id });
            if (copy) await copy.updateOne({ status: 'available', reservedForHold: null });
        }

        return NextResponse.json({ hold });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const hold = await LibraryHold.findOne({ _id: id, institute: instituteId });
        if (!hold) return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
        if (['fulfilled', 'cancelled'].includes(hold.status)) {
            return NextResponse.json({ error: 'Hold is already closed' }, { status: 409 });
        }

        const previousStatus = hold.status;
        hold.status = 'cancelled';
        await hold.save();

        if (previousStatus === 'ready') {
            const copy = await BookCopy.findOne({ institute: instituteId, reservedForHold: hold._id });
            if (copy) await copy.updateOne({ status: 'available', reservedForHold: null });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
