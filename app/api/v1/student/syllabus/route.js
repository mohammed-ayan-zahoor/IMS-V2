import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Subject from "@/models/Subject";
import BatchSyllabusProgress from "@/models/BatchSyllabusProgress";
import mongoose from "mongoose";

import Session from "@/models/Session";

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

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);

        const { searchParams } = new URL(req.url);
        const querySessionId = searchParams.get("sessionId");

        let activeSession = null;
        if (querySessionId) {
            activeSession = { _id: new mongoose.Types.ObjectId(querySessionId) };
        } else if (session.user.institute?.id) {
            activeSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                isActive: true,
                deletedAt: null
            });
            if (!activeSession) {
                activeSession = await Session.findOne({
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).sort({ startDate: -1 });
            }
        }

        const batchQuery = {
            "enrolledStudents": {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        };

        if (activeSession) {
            batchQuery.session = activeSession._id;
        }

        // 1. Find all active batches the student is enrolled in
        const myBatches = await Batch.find(batchQuery)
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

            const completedItemIds = new Set(
                (record?.completions || [])
                    .filter(c => c.isCompleted)
                    .map(c => String(c.itemId))
            );

            let totalTopics = 0;
            let completedTopics = 0;

            // Calculate detailed status for each chapter and topics
            const chapters = (pair.syllabus || []).map(chapter => {
                const isChapterDone = completedItemIds.has(String(chapter._id));

                const topics = (chapter.topics || []).map(topic => {
                    totalTopics++;
                    const isTopicDone = completedItemIds.has(String(topic._id)) || isChapterDone;
                    if (isTopicDone) completedTopics++;

                    return {
                        id: topic._id,
                        title: topic.title,
                        isCompleted: isTopicDone,
                        subTopics: (topic.subTopics || []).map(st => ({
                            id: st._id,
                            title: st.title
                        }))
                    };
                });
                
                return {
                    id: chapter._id,
                    title: chapter.title,
                    isCompleted: isChapterDone,
                    completedAt: record?.completions?.find(c => String(c.itemId) === String(chapter._id))?.completedAt,
                    topics
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
                completedTopics,
                totalTopics,
                chapters
            };
        });

        return NextResponse.json({ progress: result });

    } catch (error) {
        console.error("Student Syllabus API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
