import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import LibraryTransaction from '@/models/LibraryTransaction';

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();

        const [totals] = await LibraryTransaction.aggregate([
            { $match: { institute: instituteId, fineAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalFined: { $sum: '$fineAmount' },
                    totalCollected: { $sum: { $cond: ['$finePaid', '$fineAmount', 0] } },
                    totalPending: { $sum: { $cond: ['$finePaid', 0, '$fineAmount'] } },
                    count: { $sum: 1 },
                    paidCount: { $sum: { $cond: ['$finePaid', 1, 0] } }
                }
            }
        ]);

        return NextResponse.json({
            totalFined: totals?.totalFined || 0,
            totalCollected: totals?.totalCollected || 0,
            totalPending: totals?.totalPending || 0,
            count: totals?.count || 0,
            paidCount: totals?.paidCount || 0
        });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
