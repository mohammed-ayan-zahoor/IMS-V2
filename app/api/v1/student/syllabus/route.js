import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Subject from "@/models/Subject";
import BatchSyllabusProgress from "@/models/BatchSyllabusProgress";

/**
 * @route   GET /api/v1/student/syllabus
 * @desc    Fetch student's syllabus progress for all active subjects
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Find all active batches the student is enrolled in
        const myBatches = await Batch.find({
            "enrolledStudents": {
                $elemMatch: {
                    student: session.user.id,
                    status: "active"
                }
            },
            deletedAt: null
        })
        .populate({
            path: 'course',
            select: 'name subjects',
            populate: {
                path: 'subjects',
                select: 'name code syllabus'
            }
        });

        if (!myBatches || myBatches.length === 0) {
            return NextResponse.json({ progress: [] });
        }

        // 2. Map subjects across all batches and fetch progress
        const batchSubjectPairs = [];
        myBatches.forEach(batch => {
            if (batch.course?.subjects) {
                batch.course.subjects.forEach(subject => {
                    batchSubjectPairs.push({
                        batchId: batch._id,
                        batchName: batch.name,
                        subjectId: subject._id,
                        subjectName: subject.name,
                        subjectCode: subject.code,
                        syllabus: subject.syllabus || []
                    });
                });
            }
        });

        // 3. Fetch progress for these pairs
        const progressRecords = await BatchSyllabusProgress.find({
            batch: { $in: myBatches.map(b => b._id) }
        });

        const result = batchSubjectPairs.map(pair => {
            const record = progressRecords.find(r => 
                String(r.batch) === String(pair.batchId) && 
                String(r.subject) === String(pair.subjectId)
            );

            const totalChapters = pair.syllabus.length;
            const completedChapters = record ? record.completions.filter(c => c.itemType === 'chapter' && c.isCompleted).length : 0;
            
            // Calculate detailed status for each chapter
            const chapters = pair.syllabus.map(chapter => {
                const isDone = record?.completions?.some(c => 
                    String(c.itemId) === String(chapter._id) && 
                    c.itemType === 'chapter' && 
                    c.isCompleted
                );
                
                return {
                    id: chapter._id,
                    title: chapter.title,
                    isCompleted: !!isDone,
                    completedAt: record?.completions?.find(c => String(c.itemId) === String(chapter._id))?.completedAt
                };
            });

            return {
                batchId: pair.batchId,
                batchName: pair.batchName,
                subjectId: pair.subjectId,
                subjectName: pair.subjectName,
                subjectCode: pair.subjectCode,
                overallProgress: record?.overallProgress || 0,
                completedChapters,
                totalChapters,
                chapters
            };
        });

        return NextResponse.json({ progress: result });

    } catch (error) {
        console.error("Student Syllabus API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
