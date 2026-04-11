import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Batch from '@/models/Batch';
import { connectDB } from '@/lib/mongodb';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        
        // Ensure student is enrolled in this batch
        const batch = await Batch.findOne({
            _id: id,
            'enrolledStudents.student': session.user.id,
            deletedAt: null
        }).populate('course', 'name code').lean();

        if (!batch) {
            return NextResponse.json({ error: 'Batch not found or not enrolled' }, { status: 404 });
        }

        return NextResponse.json({ batch });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
