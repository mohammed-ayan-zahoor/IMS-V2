import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstituteScope } from '@/middleware/instituteScope';
import { SyllabusService } from '@/services/syllabusService';

/** GET /api/v1/subjects/[id]/syllabus — Returns syllabus template */
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const syllabus = await SyllabusService.getSyllabus(id, scope.instituteId);
        return NextResponse.json({ syllabus });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

/** PUT /api/v1/subjects/[id]/syllabus — Replace entire syllabus (admin only) */
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chapters } = await req.json();
        const syllabus = await SyllabusService.updateSyllabus(
            id, chapters, session.user.id, scope.instituteId
        );

        return NextResponse.json({ syllabus });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
