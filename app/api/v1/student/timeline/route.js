import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import StudentTimeline from '@/models/StudentTimeline';
import { getInstituteScope } from '@/middleware/instituteScope';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: 'Missing institute context' }, { status: 400 });
        }

        await connectDB();

        const query = {
            student: session.user.id,
            institute: scope.instituteId,
            deletedAt: null,
            $or: [
                { status: 'approved' },
                { createdBy: session.user.id }
            ]
        };

        const events = await StudentTimeline.find(query)
            .populate('createdBy', 'fullName profile.firstName profile.lastName')
            .sort({ date: -1 });

        return NextResponse.json({ events });
    } catch (error) {
        console.error('API Error [StudentTimeline GET]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
