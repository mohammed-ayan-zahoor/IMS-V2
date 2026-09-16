import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { SyllabusService } from '@/services/syllabusService';
import Batch from '@/models/Batch';
import BatchSyllabusProgress from '@/models/BatchSyllabusProgress';
import { connectDB } from '@/lib/mongodb';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');

        if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
            return NextResponse.json({ error: 'Valid batchId is required' }, { status: 400 });
        }

        await connectDB();
        
        const studentObjId = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;

        // Ensure student is enrolled in this batch
        const batch = await Batch.findOne({
            _id: new mongoose.Types.ObjectId(batchId),
            $or: [
                { 'enrolledStudents.student': studentObjId },
                { 'enrolledStudents.student': session.user.id }
            ],
            deletedAt: null
        }).lean();

        if (!batch) {
            return NextResponse.json({ error: 'Batch not found or not enrolled' }, { status: 404 });
        }

        let progressList = await SyllabusService.getProgressForBatch(batchId);

        // Fallback: If service returned empty, query BatchSyllabusProgress directly
        if (!progressList || progressList.length === 0) {
            progressList = await BatchSyllabusProgress.find({
                batch: new mongoose.Types.ObjectId(batchId)
            })
            .populate('subject', 'name code syllabus semester deletedAt')
            .populate('completions.completedBy', 'profile.firstName profile.lastName')
            .lean();
        }

        return NextResponse.json({ progressList });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
