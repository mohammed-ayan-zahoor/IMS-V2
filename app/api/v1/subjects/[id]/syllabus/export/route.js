import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstituteScope } from '@/middleware/instituteScope';
import { SyllabusService } from '@/services/syllabusService';

/** GET /api/v1/subjects/[id]/syllabus/export — Export syllabus as JSON */
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const syllabus = await SyllabusService.getSyllabus(id, scope.instituteId);
        
        const subjectRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/v1/subjects/${id}`);
        const subjectData = await subjectRes.json();
        const subjectName = subjectData.subject?.name || 'syllabus';

        return NextResponse.json({
            subject: subjectName,
            subjectCode: subjectData.subject?.code || '',
            syllabus: syllabus,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}