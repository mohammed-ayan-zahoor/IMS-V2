import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";
import mongoose from "mongoose";

const ALLOWED_FIELDS = ['chapter', 'topic', 'syllabus', 'bloomsLevel'];

// GET /api/v1/questions/distinct?field=chapter&course=<id>&subject=<id>
// Returns distinct non-null values of a field for the institute (scoped by optional course/subject).
// Powers autocomplete dropdowns in question bank create/filter forms.
export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const field   = searchParams.get('field');
        const course  = searchParams.get('course');
        const subject = searchParams.get('subject');

        if (!field || !ALLOWED_FIELDS.includes(field)) {
            return NextResponse.json({ error: `field must be one of: ${ALLOWED_FIELDS.join(', ')}` }, { status: 400 });
        }

        await connectDB();

        // ponytail: If a subject is specified and has a configured syllabus, return chapters/topics directly from Subject.syllabus
        if (subject && mongoose.Types.ObjectId.isValid(subject) && ['chapter', 'topic'].includes(field)) {
            const Subject = (await import('@/models/Subject')).default;
            const subDoc = await Subject.findById(subject).select('syllabus').lean();
            if (subDoc && subDoc.syllabus && subDoc.syllabus.length > 0) {
                if (field === 'chapter') {
                    const syllabusChapters = subDoc.syllabus.map(ch => ch.title).filter(Boolean);
                    return NextResponse.json({ values: syllabusChapters });
                }
                if (field === 'topic') {
                    const chapterParam = searchParams.get('chapter');
                    let topics = [];
                    if (chapterParam) {
                        const matchedCh = subDoc.syllabus.find(ch => ch.title.toLowerCase() === chapterParam.toLowerCase());
                        topics = (matchedCh?.topics || []).map(t => t.title).filter(Boolean);
                    } else {
                        topics = subDoc.syllabus.flatMap(ch => (ch.topics || []).map(t => t.title)).filter(Boolean);
                    }
                    return NextResponse.json({ values: Array.from(new Set(topics)).sort() });
                }
            }
        }

        const filter = { institute: scope.instituteId, isActive: true, [field]: { $exists: true, $ne: '' } };
        if (course  && mongoose.Types.ObjectId.isValid(course))  filter.course  = new mongoose.Types.ObjectId(course);
        if (subject && mongoose.Types.ObjectId.isValid(subject)) filter.subject = new mongoose.Types.ObjectId(subject);

        const values = await Question.distinct(field, filter);
        return NextResponse.json({ values: values.filter(Boolean).sort() });

    } catch (error) {
        console.error('Error fetching distinct values:', error);
        return NextResponse.json({ error: 'Failed to fetch distinct values' }, { status: 500 });
    }
}
