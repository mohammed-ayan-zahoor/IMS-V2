import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibraryTransaction from '@/models/LibraryTransaction';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();

        const overdue = await LibraryTransaction.find({
            institute: instituteId,
            status: 'active',
            dueDate: { $lt: new Date() }
        })
            .populate('bookCopy', 'accessionNumber')
            .populate('book', 'title authors')
            .populate('patron', 'profile.firstName profile.lastName enrollmentNumber grNumber admissionStd role')
            .sort({ dueDate: 1 })
            .lean();

        return NextResponse.json({ overdue, count: overdue.length });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
