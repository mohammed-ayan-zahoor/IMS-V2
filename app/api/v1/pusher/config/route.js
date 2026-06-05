import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { getInstituteScope } from '@/middleware/instituteScope';

/**
 * GET /api/v1/pusher/config
 * 
 * Public endpoint to fetch non-sensitive Pusher public configuration 
 * (Key, Cluster, Beams Instance ID) for the active tenant.
 */
export async function GET(req) {
    try {
        await connectDB();

        // 1. Check query parameters first (useful for public pages/websites)
        const { searchParams } = new URL(req.url);
        let instituteId = searchParams.get('instituteId');

        // 2. If not in query, try to get from logged-in session context
        if (!instituteId) {
            const scope = await getInstituteScope(req);
            if (scope && scope.instituteId) {
                instituteId = scope.instituteId;
            }
        }

        // Default fallbacks (Global admin config)
        const defaults = {
            key: process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
            beamsInstanceId: process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID || process.env.PUSHER_BEAMS_INSTANCE_ID
        };

        if (instituteId && /^[0-9a-fA-F]{24}$/.test(instituteId)) {
            const institute = await Institute.findById(instituteId, { 'pusher': 1 });
            
            if (institute?.pusher?.enabled && institute.pusher.key) {
                return NextResponse.json({
                    key: institute.pusher.key,
                    cluster: institute.pusher.cluster || 'mt1',
                    beamsInstanceId: institute.pusher.beamsInstanceId
                });
            }
        }

        // Fall back to system default configuration
        return NextResponse.json(defaults);

    } catch (error) {
        console.error('[Pusher Config API] Error:', error);
        return NextResponse.json(
            { error: "Failed to fetch Pusher configuration" },
            { status: 500 }
        );
    }
}
