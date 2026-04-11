import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SyllabusService } from '@/services/syllabusService';
import Batch from '@/models/Batch';
import { connectDB } from '@/lib/mongodb';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');

        if (!batchId) {
            return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
        }

        await connectDB();
        
        // Ensure student is enrolled in this batch
        const batch = await Batch.findOne({
            _id: batchId,
            'enrolledStudents.student': session.user.id,
            deletedAt: null
        }).lean();

        if (!batch) {
            return NextResponse.json({ error: 'Batch not found or not enrolled' }, { status: 404 });
        }

        const progressList = await SyllabusService.getProgressForBatch(batchId);
        return NextResponse.json({ progressList });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
