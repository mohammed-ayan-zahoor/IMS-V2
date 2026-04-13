import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstituteScope } from '@/middleware/instituteScope';
import { SyllabusService } from '@/services/syllabusService';

/** POST /api/v1/subjects/[id]/syllabus/import — Import syllabus from JSON */
export async function POST(req, { params }) {
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

        const body = await req.json();
        const { syllabus, mode = 'replace' } = body;

        if (!syllabus || !Array.isArray(syllabus)) {
            return NextResponse.json({ error: 'Invalid syllabus data. Expected an array.' }, { status: 400 });
        }

        let newSyllabus;
        
        if (mode === 'merge') {
            const existingSyllabus = await SyllabusService.getSyllabus(id, scope.instituteId);
            const merged = JSON.parse(JSON.stringify(existingSyllabus));
            const existingChapters = new Map(merged.map(ch => [ch.title.toLowerCase(), ch]));
            
            const importedChapters = syllabus.filter(ch => ch.title?.trim());
            
            for (const impCh of importedChapters) {
                const key = impCh.title.toLowerCase();
                if (existingChapters.has(key)) {
                    const existingCh = existingChapters.get(key);
                    const existingTopicTitles = new Set(existingCh.topics?.map(tp => tp.title.toLowerCase()) || []);
                    
                    for (const impTp of (impCh.topics || [])) {
                        const tpKey = impTp.title?.toLowerCase();
                        if (tpKey && !existingTopicTitles.has(tpKey)) {
                            existingCh.topics.push({ ...impTp, order: existingCh.topics.length });
                            existingTopicTitles.add(tpKey);
                        }
                    }
                } else {
                    merged.push({ ...impCh, order: merged.length });
                }
            }
            
            newSyllabus = await SyllabusService.updateSyllabus(id, merged, session.user.id, scope.instituteId);
        } else {
            newSyllabus = await SyllabusService.updateSyllabus(id, syllabus, session.user.id, scope.instituteId);
        }

        return NextResponse.json({ 
            syllabus: newSyllabus,
            message: mode === 'merge' ? 'Syllabus merged successfully' : 'Syllabus imported successfully'
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}