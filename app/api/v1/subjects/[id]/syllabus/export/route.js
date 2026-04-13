import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Subject from '@/models/Subject';
import * as XLSX from 'xlsx';

/** GET /api/v1/subjects/[id]/syllabus/export — Export syllabus as JSON */
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        
        await connectDB();
        
        const subject = await Subject.findById(id).lean();
        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({
            subject: subject.name,
            subjectCode: subject.code || '',
            syllabus: subject.syllabus || [],
            exportedAt: new Date().toISOString(),
            version: '1.0'
        });
    } catch (error) {
        console.error('Export syllabus error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}