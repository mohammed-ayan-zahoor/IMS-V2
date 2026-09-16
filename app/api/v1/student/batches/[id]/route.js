import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Batch from '@/models/Batch';
import { connectDB } from '@/lib/mongodb';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
        }

        await connectDB();
        
        const studentObjId = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;

        // Ensure student is enrolled in this batch
        const batch = await Batch.findOne({
            _id: new mongoose.Types.ObjectId(id),
            $or: [
                { 'enrolledStudents.student': studentObjId },
                { 'enrolledStudents.student': session.user.id }
            ],
            deletedAt: null
        })
        .populate('course', 'name code description')
        .populate('instructor', 'profile.firstName profile.lastName email')
        .lean();

        if (!batch) {
            return NextResponse.json({ error: 'Batch not found or not enrolled' }, { status: 404 });
        }

        return NextResponse.json({ batch });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
