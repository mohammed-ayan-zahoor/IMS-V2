import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibrarySettings from '@/models/LibrarySettings';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        let settings = await LibrarySettings.findOne({ institute: instituteId }).lean();
        // Return defaults if not yet configured
        if (!settings) {
            settings = {
                barcodeGenerationEnabled: true,
                barcodePrefix: 'LIB',
                loanRules: {
                    student: { durationDays: 14, maxBooks: 3, renewalLimit: 2 },
                    instructor: { durationDays: 30, maxBooks: 10, renewalLimit: 3 },
                    staff: { durationDays: 30, maxBooks: 10, renewalLimit: 3 }
                },
                fineConfig: { enabled: true, type: 'daily', amount: 1, offsetDays: 0 },
                holdExpiryDays: 3,
                defaultReplacementCost: 500
            };
        }
        return NextResponse.json({ settings });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const body = await req.json();

        const settings = await LibrarySettings.findOneAndUpdate(
            { institute: instituteId },
            { $set: body },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({ settings });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
