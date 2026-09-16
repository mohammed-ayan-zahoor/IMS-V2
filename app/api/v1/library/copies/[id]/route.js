import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import BookCopy from '@/models/BookCopy';
import LibraryTransaction from '@/models/LibraryTransaction';

export async function PATCH(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const body = await req.json();
        const { condition, shelfLocation, notes } = body;

        const copy = await BookCopy.findOne({ _id: id, institute: instituteId });
        if (!copy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (condition) copy.condition = condition;
        if (shelfLocation !== undefined) copy.shelfLocation = shelfLocation;
        if (notes !== undefined) copy.notes = notes;
        await copy.save();

        return NextResponse.json({ copy });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { id } = await params;
        const copy = await BookCopy.findOne({ _id: id, institute: instituteId });
        if (!copy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (['issued', 'reserved'].includes(copy.status)) {
            return NextResponse.json({ error: 'Cannot withdraw — copy is currently issued or reserved' }, { status: 409 });
        }

        copy.status = 'withdrawn';
        await copy.save();
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
